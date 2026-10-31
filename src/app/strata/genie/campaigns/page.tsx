import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPlanStatus } from "@/lib/plans";
import { accountPlatformOf, checkPostable, kindOf } from "@/lib/platforms";
import {
  FILTERS,
  STATUS_LABEL,
  aggregateFlags,
  computeFlags,
  matches,
  type CampaignLite,
  type Flags,
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

const SELECT =
  "id, name, caption_input, status, created_at, ai_note, is_group, parent_id, process_at, outputs(id, platform, storage_keys, post_jobs(id, social_account_id, status, scheduled_for, published_at, error, created_at))";

function flagsFor(c: CampaignDb): Flags {
  const posts: PostLite[] = (c.outputs ?? []).flatMap((o) =>
    (o.post_jobs ?? []).map((p) => ({ ...p, output_id: o.id }))
  );
  return computeFlags(c, posts);
}

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

  // Top-level campaigns (single ones and multi-item groups), and all items of the groups
  const { data: topRows } = await supabase
    .from("campaigns")
    .select(SELECT)
    .is("parent_id", null)
    .order("created_at", { ascending: false })
    .limit(200);
  const { data: childRows } = await supabase
    .from("campaigns")
    .select(SELECT)
    .not("parent_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1000);

  const top = (topRows ?? []) as unknown as CampaignDb[];
  const children = (childRows ?? []) as unknown as CampaignDb[];
  const childrenOf = new Map<string, CampaignDb[]>();
  for (const ch of children) {
    if (!ch.parent_id) continue;
    const list = childrenOf.get(ch.parent_id) ?? [];
    list.push(ch);
    childrenOf.set(ch.parent_id, list);
  }

  const { data: accountRows } = await supabase
    .from("social_accounts")
    .select("id, platform, username")
    .order("created_at");
  const accounts = (accountRows ?? []) as Account[];

  const items = top.map((c) => {
    if (c.is_group) {
      const kids = childrenOf.get(c.id) ?? [];
      return {
        c,
        flags: aggregateFlags(kids.map(flagsFor)),
        postableIds: [] as string[],
        itemCount: kids.length,
        canDelete: !kids.some((k) => k.status === "processing"),
      };
    }
    const outs = c.outputs ?? [];
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
    return { c, flags: flagsFor(c), postableIds, itemCount: 0, canDelete: c.status !== "processing" };
  });

  const counts: Record<string, number> = {};
  for (const f of FILTERS) counts[f.key] = items.filter((i) => matches(f.key, i.flags)).length;

  const rows: RowData[] = items
    .filter((i) => matches(filter, i.flags))
    .map(({ c, flags, postableIds, itemCount, canDelete }) => ({
      id: c.id,
      name: c.name,
      caption: c.caption_input,
      createdAt: c.created_at,
      status: c.is_group ? "group" : c.status,
      statusLabel: c.is_group
        ? "Multi-item"
        : c.status === "queued" && flags.waiting
        ? "Scheduled"
        : STATUS_LABEL[c.status] ?? c.status,
      isGroup: !!c.is_group,
      itemCount,
      active: flags.active,
      attention: flags.attention,
      scheduled: flags.scheduled,
      published: flags.published,
      failed: flags.failed,
      waiting: flags.waiting,
      nextAt: flags.nextAt,
      postableIds,
      canDelete,
    }));

  const needsRefresh = items.some((i) => i.flags.processing || i.flags.active);

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
            <small>{status.trialExpired ? "Your trial has ended." : "Post limit reached."}</small>
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
      ) : top.length === 0 ? (
        <p>No campaigns yet. Create your first one with the button above.</p>
      ) : (
        <p>No campaigns match this filter.</p>
      )}
    </main>
  );
}