"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MAX_CAPTION, validateFiles } from "@/lib/uploads";
import { PLATFORM_INFO, PLATFORM_ORDER } from "@/lib/platforms";

const LOOKS = [
  "warm and vibrant",
  "black and white",
  "bright and clean",
  "moody and cinematic",
  "zoom in on the main subject",
];
const TONES = ["fun and casual", "professional", "short and punchy", "storytelling"];

interface CampaignResponse {
  error?: string;
  campaignId?: string;
  uploads?: Array<{ url: string }>;
}

interface SubmitResponse {
  error?: string;
}

function putFile(url: string, file: File, onProgress: (pct: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Upload failed (${xhr.status})`));
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(file);
  });
}

function toggle(list: string[], item: string) {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

function buildRequest(looks: string[], tones: string[], text: string) {
  const parts: string[] = [];
  if (looks.length) parts.push(`Look: ${looks.join(", ")}.`);
  if (tones.length) parts.push(`Tone: ${tones.join(", ")}.`);
  if (text.trim()) parts.push(text.trim());
  return parts.join(" ");
}

export default function NewCampaignForm() {
  const router = useRouter();
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [looks, setLooks] = useState<string[]>([]);
  const [tones, setTones] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    setError(picked.length ? validateFiles(picked) : null);
    setFiles(picked);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (platforms.length === 0) return setError("Choose at least one platform.");
    const request = buildRequest(looks, tones, caption);
    if (!request) return setError("Pick a look or tone, or describe what you want.");
    if (request.length > MAX_CAPTION) {
      return setError(`Your request is too long (${request.length}/${MAX_CAPTION}). Shorten the text.`);
    }
    const problem = validateFiles(files);
    if (problem) return setError(problem);

    setBusy(true);
    setProgress(files.map(() => 0));
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption: request,
          platforms,
          files: files.map((f) => ({ name: f.name, type: f.type, size: f.size })),
        }),
      });

      const data = (await res.json()) as CampaignResponse;
      if (!res.ok || !data.campaignId || !data.uploads) {
        throw new Error(data.error ?? "Could not create campaign");
      }
      const { campaignId, uploads } = data;

      await Promise.all(
        files.map((file, i) =>
          putFile(uploads[i].url, file, (pct) =>
            setProgress((p) => p.map((v, j) => (j === i ? pct : v)))
          )
        )
      );

      const sub = await fetch(`/api/campaigns/${campaignId}/submit`, { method: "POST" });
      if (!sub.ok) {
        const subData = (await sub.json().catch(() => ({}))) as SubmitResponse;
        throw new Error(subData.error ?? "Could not submit");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="form-card" style={{ maxWidth: 560, margin: "24px 0" }}>
      <label>1. Where do you want to post?</label>
      <div className="checks">
        {PLATFORM_ORDER.map((p) => (
          <label key={p}>
            <input
              type="checkbox"
              disabled={busy}
              checked={platforms.includes(p)}
              onChange={() => setPlatforms((cur) => toggle(cur, p))}
            />
            {PLATFORM_INFO[p].label} <small>({PLATFORM_INFO[p].format})</small>
          </label>
        ))}
        <button
          type="button"
          className="linklike"
          disabled={busy}
          onClick={() =>
            setPlatforms((cur) => (cur.length === PLATFORM_ORDER.length ? [] : [...PLATFORM_ORDER]))
          }
        >
          {platforms.length === PLATFORM_ORDER.length ? "Clear all" : "Select all"}
        </button>
      </div>

      <label>2. Photos and videos</label>
      <input
        type="file"
        multiple
        disabled={busy}
        accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
        onChange={onPick}
      />
      {files.map((f, i) => (
        <div key={i}>
          <small>
            {f.name} ({(f.size / 1024 / 1024).toFixed(1)} MB)
          </small>
          {busy && (
            <div className="bar">
              <div style={{ width: `${progress[i] ?? 0}%` }} />
            </div>
          )}
        </div>
      ))}

      <label>3. Pick a look (optional)</label>
      <div className="chips">
        {LOOKS.map((l) => (
          <button
            type="button"
            key={l}
            disabled={busy}
            className={looks.includes(l) ? "chip active" : "chip"}
            onClick={() => setLooks((cur) => toggle(cur, l))}
          >
            {l}
          </button>
        ))}
      </div>

      <label>4. Pick a tone (optional)</label>
      <div className="chips">
        {TONES.map((t) => (
          <button
            type="button"
            key={t}
            disabled={busy}
            className={tones.includes(t) ? "chip active" : "chip"}
            onClick={() => setTones((cur) => toggle(cur, t))}
          >
            {t}
          </button>
        ))}
      </div>

      <label>5. Anything else? (optional)</label>
      <textarea
        rows={3}
        maxLength={MAX_CAPTION}
        disabled={busy}
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="e.g. Focus on the two dogs on the right, for our summer sale"
      />

      {error && <p className="error">{error}</p>}
      <button className="btn" type="submit" disabled={busy}>
        {busy ? "Uploading…" : "Create campaign"}
      </button>
    </form>
  );
}