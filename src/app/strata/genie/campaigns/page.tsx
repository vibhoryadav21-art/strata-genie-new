import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPlanStatus } from "@/lib/plans";
import { accountPlatformOf, checkPostable, kindOf } from "@/lib/platforms";
import {
  FILTERS,
  STATUS_LABEL,
  computeFlags,
  matches,
  type CampaignLite,
  type FilterKey,
  type PostLite,
} from "@/lib/campaigns";
import type { Account } from "@/components/PublishControls";
import CampaignRow, { type RowData } from "@/components/CampaignRow";
import AutoRefresh from "@/components/AutoRefresh";

export const metadata = { title: "Campaigns" };

type PostDb = Omit<PostLite, "output_id">;
type OutDb = {
  id: string;
  platform: string;
  storage_keys: string[] | null;
  post_jobs: PostDb[] | null;
};
type CampaignDb = CampaignLite & { outputs: OutDb[] | null };

export default async function Campaigns({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const sp = await searchParams;
  const filter = (FILTERS.some((f) => f.key === sp.filter) ? sp.filter : "all") as FilterKey;

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

  // One query: campaigns with their versions and the posts of each version
  const { data: campaignRows } = await supabase
    .from("campaigns")
    .select(
      "id, name, caption_input, status, created_at, ai_note, outputs(id, platform, storage_keys, post_jobs(id, social_account_id, status, scheduled_for, published_at, error, created_at))"
    )
    .order("created_at", { ascending: false })
    .limit(200);
  const campaigns = (campaignRows ?? []) as unknown as CampaignDb[];

  const { data: accountRows } = await supabase
    .from("social_accounts")
    .select("id, platform, username")
    .order("created_at");
  const accounts = (accountRows ?? []) as Account[];

  const items = campaigns.map((c) => {
    const outs = c.outputs ?? [];
    const posts: PostLite[] = outs.flatMap((o) =>
      (o.post_jobs ?? []).map((p) => ({ ...p, output_id: o.id }))
    );
    const flags = computeFlags(c, posts);
    const postableIds =
      c.status === "ready" || c.status === "posted"
        ? outs
            .filter(
              (o) =>
                accountPlatformOf(o.platform) !== null &&
                !checkPostable(o.platform, (o.storage_keys ?? []).map(kindOf))
            )
            .map((o) => o.id)
        : [];
    return { c, flags, postableIds };
  });

  const counts: Record<string, number> = {};
  for (const f of FILTERS) counts[f.key] = items.filter((i) => matches(f.key, i.c, i.flags)).length;

  const visible = items.filter((i) => matches(filter, i.c, i.flags));
  const rows: RowData[] = visible.map(({ c, flags, postableIds }) => ({
    id: c.id,
    name: c.name,
    caption: c.caption_input,
    createdAt: c.created_at,
    status: c.status,
    statusLabel: STATUS_LABEL[c.status] ?? c.status,
    active: flags.active,
    attention: flags.attention,
    scheduled: flags.scheduled,
    published: flags.published,
    failed: flags.failed,
    nextAt: flags.nextAt,
    postableIds,
    canDelete: c.status !== "processing",
  }));

  const needsRefresh = items.some(
    (i) => i.c.status === "queued" || i.c.status === "processing" || i.flags.active
  );

  return (
    <main className="container wide">
      {needsRefresh && <AutoRefresh seconds={15} />}

      <div className="page-head">
        <h1>Campaigns</h1>
        {status.canPost ? (
          <Link href="/strata/genie/campaigns/new" className="btn">
            New campaign
          </Link>
        ) : (
          <div className="head-note">
            <small>
              {status.trialExpired ? "Your trial has ended." : "Post limit reached."}
            </small>
            <Link href="/strata/genie/pricing" className="btn small secondary">
              See plans
            </Link>
          </div>
        )}
      </div>

      <div className="filters">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "all" ? "/strata/genie/campaigns" : `/strata/genie/campaigns?filter=${f.key}`}
            className={filter === f.key ? "active" : ""}
          >
            {f.label} ({counts[f.key]})
          </Link>
        ))}
      </div>

      {rows.length > 0 ? (
        <div className="camp-list">
          {rows.map((row) => (
            <CampaignRow key={row.id} row={row} accounts={accounts} />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <p>No campaigns yet. Create your first one with the button above.</p>
      ) : (
        <p>No campaigns match this filter.</p>
      )}
    </main>
  );
}