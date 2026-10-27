import base64
import logging
import os
import time
from datetime import datetime, timedelta, timezone

import httpx
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

log = logging.getLogger("instagram")
GRAPH = "https://graph.instagram.com/v24.0"  # update when Meta retires this version


# ---- Token encryption (same scheme as the website) ------------------------
def _key() -> bytes:
    raw = base64.b64decode(os.environ["TOKEN_ENCRYPTION_KEY"])
    if len(raw) != 32:
        raise RuntimeError("TOKEN_ENCRYPTION_KEY must be 32 bytes, base64-encoded")
    return raw


def decrypt_token(value: str) -> str:
    raw = base64.b64decode(value)
    return AESGCM(_key()).decrypt(raw[:12], raw[12:], None).decode()


def encrypt_token(token: str) -> str:
    iv = os.urandom(12)
    return base64.b64encode(iv + AESGCM(_key()).encrypt(iv, token.encode(), None)).decode()


# ---- API helper -----------------------------------------------------------
def _call(method: str, path: str, token: str, **params) -> dict:
    params["access_token"] = token
    r = httpx.request(
        method,
        f"{GRAPH}/{path}",
        data=params if method == "POST" else None,
        params=params if method == "GET" else None,
        timeout=60,
    )
    try:
        data = r.json()
    except ValueError:
        data = {}
    if r.status_code >= 400 or "error" in data:
        message = (data.get("error") or {}).get("message") or r.text[:300]
        raise RuntimeError(f"Instagram: {message}")
    return data


def refresh_if_needed(token: str, expires_at: datetime):
    """Returns (new_token, new_expiry) if refreshed, otherwise None."""
    now = datetime.now(timezone.utc)
    if expires_at - now > timedelta(days=10):
        return None
    try:
        r = httpx.get(
            "https://graph.instagram.com/refresh_access_token",
            params={"grant_type": "ig_refresh_token", "access_token": token},
            timeout=30,
        )
        data = r.json()
        if r.status_code >= 400 or "access_token" not in data:
            raise RuntimeError((data.get("error") or {}).get("message", "refresh refused"))
        return data["access_token"], now + timedelta(seconds=data.get("expires_in", 5183944))
    except Exception as e:
        if expires_at <= now:
            raise RuntimeError("The Instagram connection expired. Please reconnect the account.") from e
        log.warning("Token refresh failed (%s). Using the current token.", e)
        return None


# ---- Publishing -----------------------------------------------------------
def _create_container(token: str, user_id: str, **params) -> str:
    return _call("POST", f"{user_id}/media", token, **params)["id"]


def _wait_ready(token: str, container_id: str, timeout: int = 600) -> None:
    start = time.time()
    while True:
        status = _call("GET", container_id, token, fields="status_code").get("status_code")
        if status == "FINISHED":
            return
        if status in ("ERROR", "EXPIRED"):
            raise RuntimeError(f"Instagram could not process the media ({status})")
        if time.time() - start > timeout:
            raise RuntimeError("Instagram took too long to process the media")
        time.sleep(5)


def publish(token: str, user_id: str, platform: str, items: list[dict], caption: str) -> str:
    """items = [{"kind": "image"|"video", "url": "https://..."}]. Returns the Instagram media id."""
    if platform == "instagram_reels":
        if len(items) != 1 or items[0]["kind"] != "video":
            raise RuntimeError("Reels need exactly one video")
        container = _create_container(
            token, user_id, media_type="REELS", video_url=items[0]["url"],
            caption=caption, share_to_feed="true",
        )
    elif len(items) == 1:
        item = items[0]
        if item["kind"] == "video":  # single feed videos are shared as Reels
            container = _create_container(
                token, user_id, media_type="REELS", video_url=item["url"], caption=caption
            )
        else:
            container = _create_container(token, user_id, image_url=item["url"], caption=caption)
    else:
        if len(items) > 10:
            raise RuntimeError("Instagram carousels allow at most 10 items")
        children = []
        for item in items:
            if item["kind"] == "video":
                children.append(_create_container(
                    token, user_id, media_type="VIDEO", video_url=item["url"], is_carousel_item="true"))
            else:
                children.append(_create_container(
                    token, user_id, image_url=item["url"], is_carousel_item="true"))
        for child in children:
            _wait_ready(token, child)
        container = _create_container(
            token, user_id, media_type="CAROUSEL", children=",".join(children), caption=caption
        )

    _wait_ready(token, container)
    return _call("POST", f"{user_id}/media_publish", token, creation_id=container)["id"]