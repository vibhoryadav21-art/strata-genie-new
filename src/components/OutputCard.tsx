"use client";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PLATFORM_INFO, composePost, parseTags } from "@/lib/platforms";
import PublishControls, { type Account } from "@/components/PublishControls";
import ActionButton from "@/components/ActionButton";

type FileItem = { kind: "image" | "video"; viewUrl: string; downloadUrl: string };
export type PostRow = {
  id: string;
  status: string;
  scheduled_for: string;
  published_at: string | null;
  error: string | null;
  username: string | null;
};

export default function OutputCard({
  id,
  platform,
  files,
  initialCaption,
  initialTags,
  postedAt,
  supported,
  blockedReason,
  accounts,
  posts,
}: {
  id: string;
  platform: string;
  files: FileItem[];
  initialCaption: string;
  initialTags: string[];
  postedAt: string | null;
  supported: boolean;
  blockedReason: string | null;
  accounts: Account[];
  posts: PostRow[];
}) {
  const router = useRouter();
  const info = PLATFORM_INFO[platform];

  const [caption, setCaption] = useState(initialCaption);
  const [tagsText, setTagsText] = useState(initialTags.join(" "));
  const [saved, setSaved] = useState({ caption: initialCaption, tags: initialTags.join(" ") });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tags = parseTags(tagsText);
  const total = composePost(caption, tags).length;
  const over = total > info.limit || tags.length > info.maxTags;
  const dirty = caption !== saved.caption || tagsText !== saved.tags;

  async function save() {
    setBusy(true);
    setError(null);
    setMessage(null);
    const res = await fetch(`/api/outputs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caption, tags }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) setError(data.error ?? "Could not save");
    else {
      setSaved({ caption, tags: tagsText });
      setMessage("Saved");
    }
    setBusy(false);
  }

  async function copy() {
    setError(null);
    try {
      await navigator.clipboard.writeText(composePost(caption, tags));
      setMessage("Copied to clipboard");
    } catch {
      setError("Could not copy. Select the text and copy it manually.");
    }
  }

  async function markPosted() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/outputs/${id}`, { method: "POST" });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setError(data.error ?? "Could not update");
      setBusy(false);
      return;
    }
    router.refresh();
    setBusy(false);
  }

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0 }}>{info.label}</h3>
        <small>
          {info.format}
          {postedAt && " · posted ✓"}
        </small>
      </div>

      <div className="previews">
        {files.map((f, i) =>
          f.kind === "image" ? (
            <img key={i} src={f.viewUrl} alt={`${info.label} preview ${i + 1}`} />
          ) : (
            <video key={i} src={f.viewUrl} controls playsInline preload="metadata" />
          )
        )}
      </div>

      <label className="field-label">Caption</label>
      <textarea
        rows={5}
        value={caption}
        onChange={(e) => {
          setCaption(e.target.value);
          setMessage(null);
        }}
        className="full"
      />

      <label className="field-label">Tags (separate with spaces, no # needed)</label>
      <input
        value={tagsText}
        onChange={(e) => {
          setTagsText(e.target.value);
          setMessage(null);
        }}
        className="full"
      />

      <p className={over ? "error" : ""} style={{ margin: "8px 0" }}>
        <small>
          {total} / {info.limit} characters · {tags.length} tags (max {info.maxTags})
        </small>
      </p>

      {error && <p className="error">{error}</p>}
      {message && <p className="success">{message}</p>}

      <div className="actions">
        <button className="btn small" onClick={save} disabled={busy || !dirty || over || !caption.trim()}>
          Save
        </button>
        <button className="btn small secondary" onClick={copy}>
          Copy caption + tags
        </button>
        {files.map((f, i) => (
          <a key={i} href={f.downloadUrl} className="btn small secondary">
            Download {files.length > 1 ? i + 1 : ""}
          </a>
        ))}
        {!postedAt && (
          <button className="btn small secondary" onClick={markPosted} disabled={busy || dirty}>
            Mark as posted
          </button>
        )}
      </div>
      {dirty && !postedAt && (
        <p style={{ margin: "8px 0 0" }}>
          <small>Save your changes before posting or marking as posted.</small>
        </p>
      )}

      <div className="publish">
        <h4 style={{ margin: "0 0 8px" }}>Publish</h4>
        {!supported ? (
          <p style={{ margin: 0 }}>
            <small>
              Direct posting to {info.label} is coming soon. Download the file and copy the
              caption to post it yourself.
            </small>
          </p>
        ) : blockedReason ? (
          <p className="error" style={{ margin: 0 }}>
            <small>{blockedReason}</small>
          </p>
        ) : dirty ? (
          <p style={{ margin: 0 }}>
            <small>Save your changes first, then you can publish.</small>
          </p>
        ) : (
          <PublishControls outputIds={[id]} accounts={accounts} />
        )}

        {posts.map((p) => (
          <div key={p.id} className="post-row">
            <span>
              @{p.username ?? "disconnected account"} ·{" "}
              <strong>{p.status}</strong>
              {p.status === "scheduled" && (
                <>
                  {" "}for{" "}
                  <span suppressHydrationWarning>
                    {new Date(p.scheduled_for).toLocaleString()}
                  </span>
                </>
              )}
              {p.status === "published" && p.published_at && (
                <>
                  {" "}on{" "}
                  <span suppressHydrationWarning>
                    {new Date(p.published_at).toLocaleString()}
                  </span>
                </>
              )}
              {p.error && <span className="error"> {p.error}</span>}
            </span>
            {(p.status === "scheduled" || p.status === "failed") && (
              <ActionButton
                url={`/api/posts/${p.id}`}
                method="DELETE"
                label={p.status === "scheduled" ? "Cancel" : "Dismiss"}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}