"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { displayName } from "@/lib/campaigns";

export default function CampaignName({
  id,
  name,
  fallback,
  href,
  large,
}: {
  id: string;
  name: string | null;
  fallback: string;
  href?: string;
  large?: boolean;
}) {
  const router = useRouter();
  const shown = displayName(name, fallback);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(shown);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/campaigns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: value }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Could not rename");
      return;
    }
    setEditing(false);
    router.refresh();
  }

  if (editing) {
    return (
      <span className="name-edit">
        <input
          autoFocus
          value={value}
          maxLength={80}
          disabled={busy}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") setEditing(false);
          }}
        />
        <button type="button" className="btn xs" onClick={save} disabled={busy}>
          Save
        </button>
        <button type="button" className="btn xs secondary" onClick={() => setEditing(false)} disabled={busy}>
          Cancel
        </button>
        {error && <small className="error">{error}</small>}
      </span>
    );
  }

  return (
    <span className={`name-line${large ? " name-large" : ""}`}>
      {href ? (
        <Link href={href} className="name-link">
          {shown}
        </Link>
      ) : (
        <span className="name-text">{shown}</span>
      )}
      <button
        type="button"
        className="rename-btn"
        onClick={() => {
          setValue(shown);
          setError(null);
          setEditing(true);
        }}
      >
        Rename
      </button>
    </span>
  );
}