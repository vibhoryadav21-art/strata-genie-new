"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ActionButton({
  url,
  method = "POST",
  label,
  confirmText,
  className = "btn small secondary",
}: {
  url: string;
  method?: "POST" | "DELETE";
  label: string;
  confirmText?: string;
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (confirmText && !confirm(confirmText)) return;
    setBusy(true);
    setError(null);
    const res = await fetch(url, { method });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      return;
    }
    router.refresh();
  }

  return (
    <span>
      <button className={className} onClick={run} disabled={busy}>
        {busy ? "…" : label}
      </button>
      {error && <small className="error"> {error}</small>}
    </span>
  );
}