"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MAX_CAPTION, validateFiles } from "@/lib/uploads";

// Interface for the primary campaign creation response
interface CampaignResponse {
  error?: string;
  campaignId: string;
  uploads: Array<{ url: string }>;
}

// Interface for the secondary submit response
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

export default function NewCampaignForm() {
  const router = useRouter();
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
    const trimmed = caption.trim();
    if (!trimmed) return setError("Please describe what you want your post to look like.");
    const problem = validateFiles(files);
    if (problem) return setError(problem);

    setBusy(true);
    setProgress(files.map(() => 0));
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption: trimmed,
          files: files.map((f) => ({ name: f.name, type: f.type, size: f.size })),
        }),
      });
      
      // Explicitly typecast the unknown/any json payload response
      const data = (await res.json()) as CampaignResponse;
      if (!res.ok) throw new Error(data.error ?? "Could not create campaign");

      await Promise.all(
        files.map((file, i) =>
          putFile(data.uploads[i].url, file, (pct) =>
            setProgress((p) => p.map((v, j) => (j === i ? pct : v)))
          )
        )
      );

      const sub = await fetch(`/api/campaigns/${data.campaignId}/submit`, { method: "POST" });
      if (!sub.ok) {
        const subData = (await sub.json()) as SubmitResponse;
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
      <label>Photos and videos</label>
      <input
        type="file"
        multiple
        disabled={busy}
        accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
        onChange={onPick}
      />
      {files.map((f, i) => (
        <div key={i}>
          <small>{f.name} ({(f.size / 1024 / 1024).toFixed(1)} MB)</small>
          {busy && (
            <div className="bar"><div style={{ width: `${progress[i] ?? 0}%` }} /></div>
          )}
        </div>
      ))}

      <label>What should your post look like?</label>
      <textarea
        rows={4}
        maxLength={MAX_CAPTION}
        disabled={busy}
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="e.g. Bright, warm summer vibe, short and punchy, for Instagram Reels"
      />

      {error && <p className="error">{error}</p>}
      <button className="btn" type="submit" disabled={busy}>
        {busy ? "Uploading…" : "Create campaign"}
      </button>
    </form>
  );
}
