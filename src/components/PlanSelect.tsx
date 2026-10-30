"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const PLANS = ["trial", "basic", "pro", "managed"];

export default function PlanSelect({ userId, plan }: { userId: string; plan: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function change(e: React.ChangeEvent<HTMLSelectElement>) {
    const to = e.target.value;
    if (!confirm(`Change plan to "${to}"? This also resets the user's post counter.`)) {
      e.target.value = plan;
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/users/${userId}?action=plan&to=${to}`, { method: "POST" });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Could not change the plan");
      e.target.value = plan;
      return;
    }
    router.refresh();
  }

  return (
    <span>
      <select key={plan} className="inline" defaultValue={plan} onChange={change} disabled={busy}>
        {PLANS.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
      {error && <small className="error"> {error}</small>}
    </span>
  );
}