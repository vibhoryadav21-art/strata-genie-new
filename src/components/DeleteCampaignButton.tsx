"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteCampaignButton({
  id,
  disabled,
  compact,
}: {
  id: string;
  disabled?: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    if (!confirm("Delete this campaign and all its files? This can't be undone.")) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setError(data.error ?? "Could not delete");
      setBusy(false);
      return;
    }
    router.push("/strata/genie/campaigns");
    router.refresh();
  }

  return (
    <span>
      <button
        className={compact ? "btn xs danger" : "btn small danger"}
        onClick={onDelete}
        disabled={busy || disabled}
        title={disabled ? "Can't delete while Genie is processing" : undefined}
      >
        {busy ? "Deleting…" : "Delete"}
      </button>
      {!compact && disabled && (
        <small style={{ display: "block", marginTop: 6 }}>Can't delete while Genie is processing.</small>
      )}
      {error && <small className="error"> {error}</small>}
    </span>
  );
}