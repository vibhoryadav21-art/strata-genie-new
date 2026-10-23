"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteCampaignButton({
  id,
  disabled,
}: {
  id: string;
  disabled?: boolean;
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
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div>
      <button className="btn small danger" onClick={onDelete} disabled={busy || disabled}>
        {busy ? "Deleting…" : "Delete campaign"}
      </button>
      {disabled && (
        <p style={{ margin: "6px 0 0" }}>
          <small>Can't delete while Genie is processing.</small>
        </p>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}