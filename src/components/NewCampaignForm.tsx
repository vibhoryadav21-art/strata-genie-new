"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MAX_CAPTION, MAX_FILES, MAX_ITEMS, validateFiles } from "@/lib/uploads";
import { PLATFORM_INFO, PLATFORM_ORDER, accountPlatformOf, checkPostable } from "@/lib/platforms";
import type { Account } from "@/components/PublishControls";

const LOOKS = [
  "warm and vibrant",
  "black and white",
  "bright and clean",
  "moody and cinematic",
  "zoom in on the main subject",
];
const TONES = ["fun and casual", "professional", "short and punchy", "storytelling"];
const INTERVALS = [
  { minutes: 5, label: "5 minutes (for testing)" },
  { minutes: 15, label: "15 minutes" },
  { minutes: 30, label: "30 minutes" },
  { minutes: 60, label: "1 hour" },
  { minutes: 120, label: "2 hours" },
  { minutes: 180, label: "3 hours" },
  { minutes: 360, label: "6 hours" },
  { minutes: 720, label: "12 hours" },
  { minutes: 1440, label: "1 day" },
  { minutes: 2880, label: "2 days" },
  { minutes: 10080, label: "1 week" },
];

interface CreateResponse {
  error?: string;
  campaignId?: string;
  groupId?: string;
  uploads?: Array<{ url: string }>;
  items?: Array<{ url: string }>;
}

interface SubmitResponse {
  error?: string;
}

type Mode = "manual" | "now" | "scheduled";
type Structure = "together" | "individual";

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

// Uploads a few files at a time, so many large files don't choke the connection
async function uploadAll(
  files: File[],
  urls: string[],
  onProgress: (index: number, pct: number) => void,
  limit = 3
) {
  let next = 0;
  async function lane() {
    for (;;) {
      const i = next++;
      if (i >= files.length) return;
      await putFile(urls[i], files[i], (pct) => onProgress(i, pct));
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, files.length) }, lane));
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

const kindOfFile = (f: File): "image" | "video" => (f.type.startsWith("video/") ? "video" : "image");

export default function NewCampaignForm({
  accounts,
  remaining,
}: {
  accounts: Account[];
  remaining: number | null;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [looks, setLooks] = useState<string[]>([]);
  const [tones, setTones] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [structure, setStructure] = useState<Structure>("together");
  const [progress, setProgress] = useState<number[]>([]);
  const [mode, setMode] = useState<Mode>("manual");
  const [when, setWhen] = useState("");
  const [interval, setIntervalMinutes] = useState(360);
  const [accountIds, setAccountIds] = useState<string[]>(
    accounts.length === 1 ? [accounts[0].id] : []
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const individual = structure === "individual" && files.length >= 2;
  const eligible = platforms.filter((p) => accountPlatformOf(p) !== null);

  // Warnings about versions that can't be posted automatically
  const issues: string[] = [];
  if (mode !== "manual" && files.length > 0) {
    for (const p of eligible) {
      if (individual) {
        const bad = files.filter((f) => checkPostable(p, [kindOfFile(f)]));
        if (bad.length > 0) {
          issues.push(
            `${PLATFORM_INFO[p].label}: ${checkPostable(p, [kindOfFile(bad[0])])} Affected: ${bad
              .slice(0, 3)
              .map((f) => f.name)
              .join(", ")}${bad.length > 3 ? "…" : ""}`
          );
        }
      } else {
        const msg = checkPostable(p, files.map(kindOfFile));
        if (msg) issues.push(`${PLATFORM_INFO[p].label}: ${msg}`);
      }
    }
  }

  // The times shown to the customer before creating
  let slots: Date[] = [];
  if (individual && mode !== "manual") {
    const startMs = mode === "scheduled" && when ? new Date(when).getTime() : Date.now();
    if (!Number.isNaN(startMs)) {
      slots = files.map((_, i) => new Date(startMs + i * interval * 60_000));
    }
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    setError(picked.length ? validateFiles(picked, MAX_ITEMS) : null);
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
    const problem = validateFiles(files, individual ? MAX_ITEMS : MAX_FILES);
    if (problem) {
      return setError(
        !individual && files.length > MAX_FILES
          ? `Posting together allows at most ${MAX_FILES} files. Choose “individually” or remove some files.`
          : problem
      );
    }

    const needed = individual ? files.length : 1;
    if (remaining !== null && needed > remaining) {
      return setError(
        `Your plan has ${remaining} post${remaining === 1 ? "" : "s"} left, but this campaign would use ${needed}${
          individual ? " (one per file)" : ""
        }.`
      );
    }

    if (mode !== "manual") {
      if (eligible.length === 0) {
        return setError(
          "Automatic posting only works for Instagram so far. Choose an Instagram version, or pick “Review first”."
        );
      }
      if (accountIds.length === 0) return setError("Choose the account to post to.");
      if (mode === "scheduled") {
        const d = new Date(when);
        if (!when || Number.isNaN(d.getTime())) return setError("Pick a date and time.");
        if (d.getTime() < Date.now() + 60_000) return setError("Pick a time in the future.");
      }
    }

    setBusy(true);
    setProgress(files.map(() => 0));
    try {
      const fileInfo = files.map((f) => ({ name: f.name, type: f.type, size: f.size }));
      const res = await fetch(individual ? "/api/campaigns/group" : "/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          individual
            ? {
                name,
                caption: request,
                notes: caption.trim(),
                platforms,
                publishMode: mode,
                startAt: mode === "scheduled" ? new Date(when).toISOString() : null,
                intervalMinutes: interval,
                accountIds: mode === "manual" ? [] : accountIds,
                files: fileInfo,
              }
            : {
                name,
                caption: request,
                notes: caption.trim(),
                platforms,
                publishMode: mode,
                publishAt: mode === "scheduled" ? new Date(when).toISOString() : null,
                accountIds: mode === "manual" ? [] : accountIds,
                files: fileInfo,
              }
        ),
      });

      const data = (await res.json()) as CreateResponse;
      const targetId = data.groupId ?? data.campaignId;
      const urls = (data.items ?? data.uploads ?? []).map((u) => u.url);
      if (!res.ok || !targetId || urls.length !== files.length) {
        throw new Error(data.error ?? "Could not create campaign");
      }

      await uploadAll(files, urls, (i, pct) =>
        setProgress((p) => p.map((v, j) => (j === i ? pct : v)))
      );

      const sub = await fetch(`/api/campaigns/${targetId}/submit`, { method: "POST" });
      if (!sub.ok) {
        const subData = (await sub.json().catch(() => ({}))) as SubmitResponse;
        throw new Error(subData.error ?? "Could not submit");
      }

      router.push("/strata/genie/campaigns");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="form-card" style={{ maxWidth: 600, margin: "24px 0" }}>
      <label>1. Campaign name (optional)</label>
      <input
        type="text"
        maxLength={80}
        disabled={busy}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Summer sale"
      />

      <label>2. Where do you want to post?</label>
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

      <label>3. Photos and videos</label>
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

      {files.length >= 2 && (
        <div className="struct">
          <strong>How should these be posted?</strong>
          <div className="checks">
            <label>
              <input
                type="radio"
                disabled={busy}
                checked={structure === "together"}
                onChange={() => setStructure("together")}
              />
              Post together: one post with all {files.length} files (up to {MAX_FILES})
            </label>
            <label>
              <input
                type="radio"
                disabled={busy}
                checked={structure === "individual"}
                onChange={() => setStructure("individual")}
              />
              Post individually: each file is its own post, with its own caption and tags (up to{" "}
              {MAX_ITEMS})
            </label>
          </div>
        </div>
      )}

      <label>4. Pick a look (optional)</label>
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

      <label>5. Pick a tone (optional)</label>
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

      <label>6. Anything else? (optional)</label>
      <textarea
        rows={3}
        maxLength={MAX_CAPTION}
        disabled={busy}
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="e.g. Focus on the two dogs on the right, for our summer sale"
      />
      {individual && (
        <small>This applies to every item. You'll be able to add a note for single items later.</small>
      )}

      <label>7. When should it go out?</label>
      <div className="checks">
        <label>
          <input type="radio" disabled={busy} checked={mode === "manual"} onChange={() => setMode("manual")} />
          Review first, post later
          {individual && <small> (all files are processed right away)</small>}
        </label>
        <label>
          <input type="radio" disabled={busy} checked={mode === "now"} onChange={() => setMode("now")} />
          {individual ? "Start now" : "Post as soon as it's ready"}
        </label>
        <label>
          <input type="radio" disabled={busy} checked={mode === "scheduled"} onChange={() => setMode("scheduled")} />
          {individual ? "Start at" : "Schedule"}
          <input
            type="datetime-local"
            value={when}
            disabled={busy || mode !== "scheduled"}
            onChange={(e) => setWhen(e.target.value)}
            style={{ marginLeft: 8 }}
          />
        </label>
      </div>

      {individual && mode !== "manual" && (
        <>
          <label>Then one item every</label>
          <select
            className="inline"
            disabled={busy}
            value={interval}
            onChange={(e) => setIntervalMinutes(Number(e.target.value))}
          >
            {INTERVALS.map((o) => (
              <option key={o.minutes} value={o.minutes}>
                {o.label}
              </option>
            ))}
          </select>
          {slots.length > 0 && (
            <div className="slots">
              <strong>Schedule preview</strong>
              {slots.slice(0, 10).map((s, i) => (
                <div key={i}>
                  <span>{files[i].name}</span>
                  <span>{s.toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</span>
                </div>
              ))}
              {slots.length > 10 && <small>…and {slots.length - 10} more</small>}
              <small>
                Genie starts working on each item at its time, then posts it shortly after.
              </small>
            </div>
          )}
        </>
      )}

      {mode !== "manual" && (
        <>
          {accounts.length === 0 ? (
            <p>
              <small>
                No account connected yet. <Link href="/strata/genie/profile">Connect Instagram</Link>,
                then come back.
              </small>
            </p>
          ) : (
            <>
              <label>Post to</label>
              <div className="checks">
                {accounts.map((a) => (
                  <label key={a.id}>
                    <input
                      type="checkbox"
                      disabled={busy}
                      checked={accountIds.includes(a.id)}
                      onChange={() => setAccountIds((cur) => toggle(cur, a.id))}
                    />
                    @{a.username ?? "instagram"} <small>({a.platform})</small>
                  </label>
                ))}
              </div>
            </>
          )}
          <p style={{ margin: 0 }}>
            <small>
              Genie posts the text it writes without you checking it first. Only Instagram versions
              are posted automatically so far. Posts go out while Genie&apos;s worker is running.
            </small>
          </p>
          {issues.map((m) => (
            <p key={m} className="error" style={{ margin: 0 }}>
              <small>Can&apos;t be posted automatically. {m}</small>
            </p>
          ))}
        </>
      )}

      {remaining !== null && (
        <small>
          Your plan has {remaining} post{remaining === 1 ? "" : "s"} left. This campaign uses{" "}
          {individual ? `${files.length} (one per file)` : 1}.
        </small>
      )}

      {error && <p className="error">{error}</p>}
      <button className="btn" type="submit" disabled={busy}>
        {busy ? "Uploading…" : "Create campaign"}
      </button>
    </form>
  );
}