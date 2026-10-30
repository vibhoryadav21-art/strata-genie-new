import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPlanStatus } from "@/lib/plans";
import { accountPlatformOf, checkPostable, kindOf } from "@/lib/platforms";
import PublishControls, { type Account } from "@/components/PublishControls";
import DeleteCampaignButton from "@/components/DeleteCampaignButton";
import AutoRefresh from "@/components/AutoRefresh";
import LocalTime from "@/components/LocalTime";

export const metadata = { title: "Campaigns" };

type OutRow = { id: string; campaign_id: string; platform: string; storage_keys: string[] | null };
type PostLite = { output_id: string; status: string; scheduled_for: string };

export default async function Campaigns() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/strata/genie/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (!profile) {
    return <main className="container">Setting up your profile… refresh in a moment.</main>;
  }
  const status = getPlanStatus(profile);

  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, caption_input, status, created_at")
    .order("created_at", { ascending: false });

  const { data: accountRows } = await supabase
    .from("social_accounts")
    .select("id, platform, username")
    .order("created_at");
  const accounts = (accountRows ?? []) as Account[];

  // Outputs and posts for finished campaigns (to power the row actions)
  const readyIds = (campaigns ?? [])
    .filter((c) => c.status === "ready" || c.status === "posted")
    .map((c) => c.id);
  let outputs: OutRow[] = [];
  let posts: PostLite[] = [];
  if (readyIds.length > 0) {
    const { data } = await supabase
      .from("outputs")
      .select("id, campaign_id, platform, storage_keys")
      .in("campaign_id", readyIds);
    outputs = (data ?? []) as OutRow[];
    if (outputs.length > 0) {
      const { data: p } = await supabase
        .from("post_jobs")
        .select("output_id, status, scheduled_for")
        .in("output_id", outputs.map((o) => o.id));
      posts = (p ?? []) as PostLite[];
    }
  }

  const hasPending =
    (campaigns ?? []).some((c) => c.status === "queued" || c.status === "processing") ||
    posts.some((p) => p.status === "scheduled" || p.status === "publishing");

  return (
    <main className="container">
      {hasPending && <AutoRefresh seconds={15} />}
      <h1>Campaigns</h1>

      <div className="card">
        <p>
          Signed in as <strong>{profile.email}</strong>
        </p>
        <p>
          Plan: <span className="badge">{profile.plan}</span>
          {profile.plan === "trial" &&
            (status.trialExpired ? " · trial expired" : ` · ${status.daysLeft} day(s) left`)}
        </p>
        <p>
          Posts used: {profile.posts_used_this_period}
          {status.limit !== null ? ` / ${status.limit}` : " (unlimited)"}
        </p>
        {status.canPost ? (
          <Link href="/strata/genie/campaigns/new" className="btn">
            New campaign
          </Link>
        ) : (
          <p className="error">Post limit reached or trial expired.</p>
        )}
      </div>

      <h2 style={{ marginTop: 40 }}>History</h2>
      {campaigns && campaigns.length > 0 ? (
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Request</th>
              <th>Status</th>
              <th>Posting</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => {
              const outs = outputs.filter((o) => o.campaign_id === c.id);
              const postableIds = outs
                .filter(
                  (o) =>
                    accountPlatformOf(o.platform) !== null &&
                    !checkPostable(o.platform, (o.storage_keys ?? []).map(kindOf))
                )
                .map((o) => o.id);
              const mine = posts.filter((p) => outs.some((o) => o.id === p.output_id));
              const published = mine.filter((p) => p.status === "published").length;
              const failed = mine.filter((p) => p.status === "failed").length;
              const pending = mine
                .filter((p) => p.status === "scheduled" || p.status === "publishing")
                .sort((a, b) => a.scheduled_for.localeCompare(b.scheduled_for));
              const canPost =
                (c.status === "ready" || c.status === "posted") && postableIds.length > 0;

              return (
                <tr key={c.id}>
                  <td>{new Date(c.created_at).toLocaleDateString()}</td>
                  <td>
                    <Link href={`/strata/genie/campaigns/${c.id}`}>{c.caption_input}</Link>
                  </td>
                  <td>{c.status}</td>
                  <td>
                    {pending.length > 0 && (
                      <div>
                        {pending.length} waiting · next <LocalTime iso={pending[0].scheduled_for} />
                      </div>
                    )}
                    {published > 0 && <div>{published} published</div>}
                    {failed > 0 && <div className="error">{failed} failed</div>}
                    {pending.length + published + failed === 0 && "—"}
                  </td>
                  <td>
                    <div className="row-actions">
                      <Link href={`/strata/genie/campaigns/${c.id}`} className="btn small secondary">
                        Open
                      </Link>
                      {canPost && (
                        <details className="row-post">
                          <summary>Post / schedule</summary>
                          <PublishControls
                            outputIds={postableIds}
                            accounts={accounts}
                            buttonLabel="Post now"
                          />
                        </details>
                      )}
                      <DeleteCampaignButton id={c.id} disabled={c.status === "processing"} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <p>No campaigns yet.</p>
      )}
    </main>
  );
}