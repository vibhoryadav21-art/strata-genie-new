import io
import logging
import os
import subprocess
import tempfile
import time
from pathlib import Path
from datetime import datetime, timezone
import instagram  # noqa: E402

import boto3
from botocore.config import Config
from dotenv import load_dotenv
from PIL import Image, ImageEnhance, ImageOps
from supabase import create_client

load_dotenv()
import ai  # noqa: E402  (after load_dotenv so settings are available)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("worker")
logging.getLogger("httpx").setLevel(logging.WARNING)

MAX_ATTEMPTS = 3
POLL_SECONDS = 10

sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SECRET_KEY"])

BUCKET = os.environ["R2_BUCKET"]
s3 = boto3.client(
    "s3",
    endpoint_url=f"https://{os.environ['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com",
    aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
    aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
    region_name="auto",
    # Newer boto3 adds checksum headers that R2 can reject
    config=Config(
        request_checksum_calculation="when_required",
        response_checksum_validation="when_required",
    ),
)

# ---- Formats and platforms ------------------------------------------------
FORMATS = {
    "vertical": (1080, 1920),   # 9:16
    "portrait": (1080, 1350),   # 4:5
    "landscape": (1920, 1080),  # 16:9
}
PLATFORMS = {
    "instagram_reels": "vertical",
    "tiktok": "vertical",
    "instagram_feed": "portrait",
    "threads": "portrait",
    "x": "landscape",
    "facebook": "landscape",
}
assert set(PLATFORMS) == set(ai.PLATFORM_RULES), "PLATFORMS and ai.PLATFORM_RULES must match"


# ---- Media processing -----------------------------------------------------
def process_image(src: Path, dst: Path, size: tuple[int, int], plan: dict,
                  focus: tuple[float, float]) -> None:
    W, H = size
    with Image.open(src) as img:
        img = ImageOps.exif_transpose(img).convert("RGB")
        iw, ih = img.size

        # Size of the crop window (in source pixels) that matches the target shape,
        # made smaller when the plan asks for zoom.
        s = max(W / iw, H / ih)
        cw, ch = W / s / plan["zoom"], H / s / plan["zoom"]

        # Centre the window on the subject, but keep it inside the picture.
        left = min(max(focus[0] * iw - cw / 2, 0), iw - cw)
        top = min(max(focus[1] * ih - ch / 2, 0), ih - ch)
        img = img.resize(size, Image.LANCZOS, box=(left, top, left + cw, top + ch))

        if plan["grayscale"]:
            img = ImageOps.grayscale(img).convert("RGB")
        elif plan["saturation"] != 1.0:
            img = ImageEnhance.Color(img).enhance(plan["saturation"])
        if plan["contrast"] != 1.0:
            img = ImageEnhance.Contrast(img).enhance(plan["contrast"])
        img.save(dst, "JPEG", quality=90, optimize=True)


def process_video(src: Path, dst: Path, size: tuple[int, int], plan: dict,
                  focus: tuple[float, float]) -> None:
    w, h = size
    fx, fy = focus
    z = plan["zoom"]
    filters = [
        # Scale up so the picture covers the target (bigger when zooming)...
        f"scale={int(round(w * z))}:{int(round(h * z))}:force_original_aspect_ratio=increase",
        # ...then cut out a window centred on the subject, kept inside the picture.
        f"crop={w}:{h}:'min(max({fx:.3f}*iw-{w}/2,0),iw-{w})':'min(max({fy:.3f}*ih-{h}/2,0),ih-{h})'",
        f"fps={plan['fps']}",
    ]
    if plan["saturation"] != 1.0 or plan["contrast"] != 1.0:
        filters.append(f"eq=saturation={plan['saturation']:.3f}:contrast={plan['contrast']:.3f}")
    if plan["grayscale"]:
        filters.append("hue=s=0")
    filters.append("format=yuv420p")

    duration = plan["trim_seconds"] or plan["max_video_seconds"]
    cmd = [
        "ffmpeg", "-y", "-i", str(src),
        "-t", str(duration),
        "-vf", ",".join(filters),
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
        "-c:a", "aac", "-b:a", "128k",
        "-movflags", "+faststart",
        str(dst),
    ]
    try:
        subprocess.run(cmd, check=True, capture_output=True, text=True, timeout=1800)
    except subprocess.CalledProcessError as e:
        raise RuntimeError(f"ffmpeg failed: {e.stderr[-500:]}") from e


# ---- Previews for the AI --------------------------------------------------
def probe_duration(path: Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
        capture_output=True, text=True, check=True,
    ).stdout.strip()
    return float(out)


def jpeg_bytes_from_image(path: Path) -> bytes:
    with Image.open(path) as img:
        img = ImageOps.exif_transpose(img).convert("RGB")
        img.thumbnail((768, 768))
        buf = io.BytesIO()
        img.save(buf, "JPEG", quality=80)
        return buf.getvalue()


def video_frames(path: Path, tmp: Path, index: int, count: int = 3) -> list[bytes]:
    duration = probe_duration(path)
    frames = []
    for k in range(count):
        t = duration * (k + 1) / (count + 1)
        out = tmp / f"preview_{index}_{k}.jpg"
        subprocess.run(
            ["ffmpeg", "-y", "-ss", f"{t:.2f}", "-i", str(path),
             "-frames:v", "1", "-vf", "scale=768:-2", "-q:v", "4", str(out)],
            check=True, capture_output=True,
        )
        frames.append(out.read_bytes())
    return frames


def build_previews(assets: list[dict], local: list[Path], tmp: Path):
    media_info: list[dict] = []
    previews: list[tuple[int, bytes]] = []
    for i, (asset, path) in enumerate(zip(assets, local)):
        try:
            if asset["type"] == "image":
                media_info.append({"index": i, "type": "image"})
                previews.append((i, jpeg_bytes_from_image(path)))
            else:
                media_info.append({"index": i, "type": "video", "duration": probe_duration(path)})
                previews.extend((i, data) for data in video_frames(path, tmp, i))
        except Exception as e:
            log.warning("Could not build preview for item %d: %s", i, e)
            media_info.append({"index": i, "type": asset["type"], "duration": 0.0})
    return media_info, previews[:12]


# ---- Job handling ---------------------------------------------------------
def claim_job() -> dict | None:
    res = sb.rpc("claim_next_job").execute()
    return res.data or None


def handle_job(job: dict) -> None:
    campaign_id = job["campaign_id"]
    user_id = job["user_id"]

    # Only the platforms the user chose (and that we know about).
    # Old campaigns created before this feature have no choice and get all platforms.
    platforms = [p for p in (job.get("platforms") or []) if p in PLATFORMS] or list(PLATFORMS)
    formats = sorted({PLATFORMS[p] for p in platforms})
    log.info("Platforms: %s -> formats: %s", platforms, formats)

    assets = (
        sb.table("media_assets").select("*").eq("campaign_id", campaign_id)
        .order("created_at").execute().data
    )
    if not assets:
        raise RuntimeError("Campaign has no media assets")

    # Safety: every file must live in this user's own campaign folder
    prefix = f"{user_id}/{campaign_id}/"
    if any(not a["storage_key"].startswith(prefix) for a in assets):
        raise RuntimeError("A media file does not belong to this campaign")

    results: dict[str, list[str]] = {fmt: [] for fmt in formats}

    with tempfile.TemporaryDirectory() as tmp_name:
        tmp = Path(tmp_name)

        # 1. Download everything
        local: list[Path] = []
        for i, asset in enumerate(assets):
            src = tmp / f"in_{i}{Path(asset['storage_key']).suffix}"
            log.info("Downloading %s", asset["storage_key"])
            s3.download_file(BUCKET, asset["storage_key"], str(src))
            local.append(src)

        # 2. Ask the AI for an edit plan, captions and tags (with safe fallback)
        media_info, previews = build_previews(assets, local, tmp)
        try:
            result = ai.run_genie(job["caption_input"], media_info, previews, platforms)
            plan, copy = ai.sanitize(result, len(assets), job["caption_input"], platforms)
            log.info("AI plan: %s", plan)
        except Exception as e:
            log.warning("AI step failed (%s). Using defaults.", e)
            plan, copy = ai.fallback(job["caption_input"], platforms)

        # 3. Process every file into every needed format
        for i, (asset, src) in enumerate(zip(assets, local)):
            is_image = asset["type"] == "image"
            ext = "jpg" if is_image else "mp4"
            content_type = "image/jpeg" if is_image else "video/mp4"
            focus = plan["focus"].get(i, (0.5, 0.5))

            for fmt in formats:
                dst = tmp / f"out_{fmt}_{i}.{ext}"
                log.info("Processing item %d as %s", i, fmt)
                (process_image if is_image else process_video)(src, dst, FORMATS[fmt], plan, focus)
                key = f"{user_id}/{campaign_id}/out/{fmt}-{i}.{ext}"
                s3.upload_file(str(dst), BUCKET, key, ExtraArgs={"ContentType": content_type})
                results[fmt].append(key)
                dst.unlink()

    # 4. Save outputs (delete old ones first so retries don't create duplicates)
    sb.table("outputs").delete().eq("campaign_id", campaign_id).execute()
    rows = [
        {
            "campaign_id": campaign_id,
            "platform": platform,
            "storage_keys": results[PLATFORMS[platform]],
            "final_caption": copy[platform]["caption"],
            "tags": copy[platform]["tags"],
        }
        for platform in platforms
    ]
    sb.table("outputs").insert(rows).execute()
    sb.table("campaigns").update({"status": "ready"}).eq("id", campaign_id).execute()
    sb.table("jobs").update({"status": "done", "error": None}).eq("id", job["job_id"]).execute()

def fail_job(job: dict, message: str) -> None:
    final = job["attempts"] >= MAX_ATTEMPTS
    sb.table("jobs").update(
        {"status": "failed" if final else "queued", "error": message[:1000]}
    ).eq("id", job["job_id"]).execute()
    if final:
        sb.table("campaigns").update({"status": "failed"}).eq("id", job["campaign_id"]).execute()


# ---- Publishing posts -----------------------------------------------------
def claim_post() -> dict | None:
    res = sb.rpc("claim_next_post").execute()
    return res.data or None


def handle_post(post: dict) -> None:
    if post["account_platform"] != "instagram":
        raise RuntimeError(f"Posting to {post['account_platform']} is not supported yet")

    keys = post["storage_keys"] or []
    if not keys:
        raise RuntimeError("Nothing to post")

    # Instagram downloads the files itself, so it needs temporary public links
    items = [
        {
            "kind": "video" if k.lower().endswith(".mp4") else "image",
            "url": s3.generate_presigned_url(
                "get_object", Params={"Bucket": BUCKET, "Key": k}, ExpiresIn=7200
            ),
        }
        for k in keys
    ]

    caption = post["caption"] or ""
    tags = post["tags"] or []
    if tags:
        caption += "\n\n" + " ".join(f"#{t}" for t in tags)

    token = instagram.decrypt_token(post["token_encrypted"])
    expires = datetime.fromisoformat(post["token_expires_at"])
    refreshed = instagram.refresh_if_needed(token, expires)
    if refreshed:
        token, expires = refreshed
        sb.table("social_tokens").update({
            "token_encrypted": instagram.encrypt_token(token),
            "expires_at": expires.isoformat(),
            "refreshed_at": datetime.now(timezone.utc).isoformat(),
        }).eq("account_id", post["account_id"]).execute()

    media_id = instagram.publish(token, post["external_id"], post["platform"], items, caption)

    now = datetime.now(timezone.utc).isoformat()
    sb.table("post_jobs").update({
        "status": "published", "external_post_id": media_id,
        "published_at": now, "error": None,
    }).eq("id", post["post_id"]).execute()
    sb.table("outputs").update({"posted_at": now}).eq("id", post["output_id"]).execute()
    sb.table("campaigns").update({"status": "posted"}).eq("id", post["campaign_id"]).eq("status", "ready").execute()


def fail_post(post: dict, message: str) -> None:
    sb.table("post_jobs").update(
        {"status": "failed", "error": message[:500]}
    ).eq("id", post["post_id"]).execute()


def process_next_post() -> bool:
    post = None
    try:
        post = claim_post()
        if post is None:
            return False
        log.info("Publishing %s to account %s", post["platform"], post["account_id"])
        handle_post(post)
        log.info("Published post %s", post["post_id"])
        return True
    except Exception as e:
        log.exception("Publishing failed")
        if post:
            try:
                fail_post(post, str(e))
            except Exception:
                log.exception("Could not record the failure")
            return True
        return False


def process_next_job() -> bool:
    job = None
    try:
        job = claim_job()
        if job is None:
            return False
        log.info("Claimed job %s (attempt %s)", job["job_id"], job["attempts"])
        handle_job(job)
        log.info("Finished job %s", job["job_id"])
        return True
    except Exception as e:
        log.exception("Job failed")
        if job:
            try:
                fail_job(job, str(e))
            except Exception:
                log.exception("Could not record the failure")
            return True
        return False


def main() -> None:
    if os.environ.get("GEMINI_API_KEY"):
        log.info("AI enabled (model: %s)", os.environ.get("GEMINI_MODEL", "gemini-flash-latest"))
    else:
        log.warning("GEMINI_API_KEY not set: AI disabled, using defaults")
    log.info("Worker started. Waiting for jobs and scheduled posts…")
    while True:
        did_post = process_next_post()
        did_job = process_next_job()
        if not (did_post or did_job):
            time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    main()