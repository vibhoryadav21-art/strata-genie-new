import Link from "next/link";
import { requireAdmin, one } from "@/lib/admin";
import LocalTime from "@/components/LocalTime";

const head = { count: "exact" as const, head: true };
const CAMPAIGN_STATUSES = ["draft", "queued", "processing", "ready", "posted", "failed"];
const POST_STATUSES = ["scheduled", "publishing", "published", "failed"];

export default async function AdminOverview() {
  const { supabase } = await requireAdmin();

  const users = await supabase.from("profiles").select("id", head);
  const campaignCounts = await Promise.all(
    CAMPAIGN_STATUSES.map(async (s) => ({
      s,
      n: (await supabase.from("campaigns").select("id", head).eq("status", s)).count ?? 0,
    }))
  );
  const postCounts = await Promise.all(
    POST_STATUSES.map(async (s) => ({
      s,
      n: (await supabase.from("post_jobs").select("id", head).eq("status", s)).count ?? 0,
    }))
  );

  const { data: attention } = await supabase
    .from("campaigns")
    .select("id, caption_input, status, created_at, ai_note")
    .or("status.eq.failed,ai_note.not.is.null")
    .order("created_at", { ascending: false })
    .limit(10);

  const { data: failedPosts } = await supabase
    .from("post_jobs")
    .select("id, error, scheduled_for, outputs(campaign_id, platform)")
    .eq("status", "failed")
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <main className="container wide">
      <h1>Overview</h1>

      <div className="features">
        <div className="card">
          <small>Users</small>
          <p className="stat">{users.count ?? 0}</p>
        </div>
        {campaignCounts.map((c) => (
          <div className="card" key={c.s}>
            <small>Campaigns · {c.s}</small>
            <p className="stat">{c.n}</p>
          </div>
        ))}
        {postCounts.map((c) => (
          <div className="card" key={c.s}>
            <small>Posts · {c.s}</small>
            <p className="stat">{c.n}</p>
          </div>
        ))}
      </div>

      <h2 style={{ marginTop: 40 }}>Needs attention</h2>
      {(attention ?? []).length === 0 && (failedPosts ?? []).length === 0 ? (
        <p>Nothing needs attention right now.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>When</th>
                <th>What</th>
                <th>Problem</th>
              </tr>
            </thead>
            <tbody>
              {(attention ?? []).map((c) => (
                <tr key={c.id}>
                  <td>
                    <LocalTime iso={c.created_at} />
                  </td>
                  <td>
                    <Link href={`/admin/campaigns/${c.id}`}>{c.caption_input}</Link>
                  </td>
                  <td>
                    {c.status === "failed" ? "Processing failed" : "AI step failed (basic text used)"}
                  </td>
                </tr>
              ))}
              {(failedPosts ?? []).map((p) => {
                const out = one(p.outputs as { campaign_id: string; platform: string }[] | null);
                return (
                  <tr key={p.id}>
                    <td>
                      <LocalTime iso={p.scheduled_for} />
                    </td>
                    <td>
                      {out ? (
                        <Link href={`/admin/campaigns/${out.campaign_id}`}>Post to {out.platform}</Link>
                      ) : (
                        "Post"
                      )}
                    </td>
                    <td className="error">{p.error ?? "Failed"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}