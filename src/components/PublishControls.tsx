"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export type Account = { id: string; platform: string; username: string | null };

export default function PublishControls({
  outputIds,
  accounts,
  buttonLabel = "Post",
}: {
  outputIds: string[];
  accounts: Account[];
  buttonLabel?: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(
    accounts.length === 1 ? [accounts[0].id] : []
  );
  const [mode, setMode] = useState<"now" | "later">("now");
  const [when, setWhen] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (accounts.length === 0) {
    return (
      <p>
        <small>
          No account connected yet. <Link href="/genie/accounts">Connect one</Link> to post directly.
        </small>
      </p>
    );
  }

  async function go() {
    setError(null);
    setMessage(null);
    if (selected.length === 0) return setError("Choose at least one account.");

    let iso: string | null = null;
    if (mode === "later") {
      const d = new Date(when);
      if (!when || Number.isNaN(d.getTime())) return setError("Pick a date and time.");
      if (d.getTime() < Date.now() + 60_000) return setError("Pick a time in the future.");
      iso = d.toISOString();
    }

    setBusy(true);
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outputIds, accountIds: selected, scheduledFor: iso }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      created?: number;
      problems?: string[];
    };
    setBusy(false);

    if (!res.ok) return setError(data.error ?? "Could not queue the post");
    if (data.problems?.length) setError(data.problems.join(" "));
    if (data.created) {
      setMessage(
        mode === "now"
          ? `Queued ${data.created} post(s). They go out shortly, while Genie's worker is running.`
          : `Scheduled ${data.created} post(s).`
      );
      router.refresh();
    }
  }

  return (
    <div className="publish-controls">
      <div className="checks">
        {accounts.map((a) => (
          <label key={a.id}>
            <input
              type="checkbox"
              checked={selected.includes(a.id)}
              onChange={() =>
                setSelected((cur) =>
                  cur.includes(a.id) ? cur.filter((x) => x !== a.id) : [...cur, a.id]
                )
              }
            />
            @{a.username ?? "instagram"} <small>({a.platform})</small>
          </label>
        ))}
      </div>

      <div className="checks" style={{ marginTop: 8 }}>
        <label>
          <input type="radio" checked={mode === "now"} onChange={() => setMode("now")} />
          Post now
        </label>
        <label>
          <input type="radio" checked={mode === "later"} onChange={() => setMode("later")} />
          Schedule
          <input
            type="datetime-local"
            value={when}
            disabled={mode !== "later"}
            onChange={(e) => setWhen(e.target.value)}
            style={{ marginLeft: 8 }}
          />
        </label>
      </div>

      {error && <p className="error">{error}</p>}
      {message && <p className="success">{message}</p>}
      <button className="btn small" onClick={go} disabled={busy}>
        {busy ? "Working…" : mode === "now" ? buttonLabel : "Schedule"}
      </button>
    </div>
  );
}