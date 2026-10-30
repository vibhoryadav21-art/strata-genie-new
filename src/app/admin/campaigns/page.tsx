import Link from "next/link";
import { requireAdmin, one } from "@/lib/admin";
import ActionButton from "@/components/ActionButton";
import LocalTime from "@/components/LocalTime";
import { fmtInt, fmtSec, fmtUsd, num } from "@/lib/usage";

export const metadata = { title: "Admin · Campaigns" };

const FILTERS = ["all", "attention", "queued", "processing", "ready", "posted", "failed", "draft"];

type JobLite = { campaign_id: string; status: string; error: string | null; attempts: number };

export default async function AdminCampaigns({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const { supabase } = await requireAdmin();
  const current = FILTERS.includes(status ?? "") ? (status as string) : "all";

  let query = supabase
    .from("campaigns")
    .select("id, caption_input, status, created_at, platforms, ai_note, profiles(email)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (current === "attention") query = query.or("status.eq.failed,ai_note.not.is.null");
  else if (current !== "all") query = query.eq("status", current);
  const { data: campaigns } = await query;

  const ids = (campaigns ?? []).map((c) => c.id);

  // Latest job per campaign, to show the last error
  const jobByCampaign = new Map<string, JobLite>();
  // Cost and time per campaign
  const usageByCampaign = new Map<string, { neurons: number; cost: number; seconds: number }>();

  if (ids.length > 0) {
    const { data: jobs } = await supabase
      .from("jobs")
      .select("campaign_id, status, error, attempts, created_at")
      .in("campaign_id", ids)
      .order("created_at", { ascending: false });
    for (const j of (jobs ?? []) as JobLite[]) {
      if (!jobByCampaign.has(j.campaign_id)) jobByCampaign.set(j.campaign_id, j);
    }

    const { data: events } = await supabase
      .from("usage_events")
      .select("campaign_id, kind, neurons_est, cost_usd_est, seconds")
      .in("campaign_id", ids)
      .limit(5000);
    for (const e of events ?? []) {
      if (!e.campaign_id) continue;
      const cur = usageByCampaign.get(e.campaign_id) ?? { neurons: 0, cost: 0, seconds: 0 };
      cur.neurons += num(e.neurons_est);
      cur.cost += num(e.cost_usd_est);
      if (e.kind === "processing") cur.seconds += num(e.seconds);
      usageByCampaign.set(e.campaign_id, cur);
    }
  }

  return (
    <main className="container wide">
      <h1>Campaigns</h1>

      <div className="filters">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={f === "all" ? "/admin/campaigns" : `/admin/campaigns?status=${f}`}
            className={current === f ? "active" : ""}
          >
            {f === "attention" ? "needs attention" : f}
          </Link>
        ))}
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Created</th>
              <th>User</th>
              <th>Request</th>
              <th>Status</th>
              <th>AI (est.)</th>
              <th>Time</th>
              <th>Last problem</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(campaigns ?? []).map((c) => {
              const owner = one(c.profiles as { email: string }[] | null);
              const job = jobByCampaign.get(c.id);
              const u = usageByCampaign.get(c.id);
              return (
                <tr key={c.id}>
                  <td>
                    <LocalTime iso={c.created_at} />
                  </td>
                  <td>{owner?.email ?? "?"}</td>
                  <td style={{ maxWidth: 300 }}>
                    <Link href={`/admin/campaigns/${c.id}`}>{c.caption_input}</Link>
                  </td>
                  <td>
                    {c.status}
                    {c.ai_note && (
                      <div className="error">
                        <small>AI step failed</small>
                      </div>
                    )}
                  </td>
                  <td>
                    {u && (u.neurons || u.cost)
                      ? `${u.neurons ? fmtInt(u.neurons) + " N · " : ""}${fmtUsd(u.cost)}`
                      : "—"}
                  </td>
                  <td>{u && u.seconds ? fmtSec(u.seconds) : "—"}</td>
                  <td style={{ maxWidth: 260 }}>
                    {job?.error ? <small className="error">{job.error.slice(0, 160)}</small> : "—"}
                  </td>
                  <td>
                    <div className="actions-cell">
                      <Link href={`/admin/campaigns/${c.id}`} className="btn small secondary">
                        Open
                      </Link>
                      {["ready", "failed", "queued"].includes(c.status) && (
                        <ActionButton
                          url={`/api/admin/campaigns/${c.id}`}
                          label="Re-run"
                          confirmText="Process this campaign again? Existing results are replaced."
                        />
                      )}
                      <ActionButton
                        url={`/api/admin/campaigns/${c.id}`}
                        method="DELETE"
                        label="Delete"
                        className="btn small danger"
                        confirmText="Delete this campaign and all its files? This can't be undone."
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {(campaigns ?? []).length === 0 && <p>No campaigns match this filter.</p>}
    </main>
  );
}