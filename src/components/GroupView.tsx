import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { presignView } from "@/lib/r2";
import { PLATFORM_INFO, kindOf } from "@/lib/platforms";
import {
  STATUS_LABEL,
  aggregateFlags,
  computeFlags,
  type CampaignLite,
  type PostLite,
} from "@/lib/campaigns";
import CampaignName from "@/components/CampaignName";
import DeleteCampaignButton from "@/components/DeleteCampaignButton";
import AutoRefresh from "@/components/AutoRefresh";
import LocalTime from "@/components/LocalTime";
import GroupItem, { type ItemData } from "@/components/GroupItem";

type PostDb = Omit<PostLite, "output_id">;
type ChildDb = CampaignLite & {
  position: number | null;
  publish_mode: string;
  outputs: { id: string; post_jobs: PostDb[] | null }[] | null;
};

export default async function GroupView({
  campaign,
}: {
  campaign: {
    id: string;
    name: string | null;
    caption_input: string;
    created_at: string;
    platforms: string[] | null;
  };
}) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("campaigns")
    .select(
      "id, name, caption_input, status, created_at, ai_note, process_at, position, publish_mode, outputs(id, post_jobs(id, social_account_id, status, scheduled_for, published_at, error, created_at))"
    )
    .eq("parent_id", campaign.id)
    .order("position");
  const children = (data ?? []) as unknown as ChildDb[];

  const ids = children.map((c) => c.id);
  const { data: media } = ids.length
    ? await supabase.from("media_assets").select("campaign_id, storage_key, type").in("campaign_id", ids)
    : { data: [] };
  const mediaOf = new Map((media ?? []).map((m) => [m.campaign_id as string, m]));

  const items: ItemData[] = [];
  const allFlags = [];
  for (const ch of children) {
    const posts: PostLite[] = (ch.outputs ?? []).flatMap((o) =>
      (o.post_jobs ?? []).map((p) => ({ ...p, output_id: o.id }))
    );
    const flags = computeFlags(ch, posts);
    allFlags.push(flags);
    const m = mediaOf.get(ch.id);
    items.push({
      id: ch.id,
      name: ch.name,
      fallback: ch.caption_input,
      thumbUrl: m ? await presignView(m.storage_key as string) : null,
      kind: m ? kindOf(m.storage_key as string) : "image",
      status: ch.status,
      statusLabel: flags.waiting ? "Scheduled" : STATUS_LABEL[ch.status] ?? ch.status,
      processAt: ch.process_at ?? null,
      waiting: flags.waiting > 0,
      attention: flags.attention,
      scheduled: flags.scheduled,
      published: flags.published,
      failed: flags.failed,
      nextAt: flags.nextAt,
      canDelete: ch.status !== "processing",
    });
  }

  const total = aggregateFlags(allFlags);
  const autoPost = children.some((c) => c.publish_mode === "now");
  const times = children.map((c) => c.process_at).filter((t): t is string => !!t).sort();
  const platformLabels = (campaign.platforms ?? []).map((p) => PLATFORM_INFO[p]?.label ?? p).join(", ");

  return (
    <main className="container wide">
      {(total.processing || total.active) && <AutoRefresh seconds={15} />}

      <p>
        <Link href="/strata/genie/campaigns">← Back to campaigns</Link>
      </p>
      <h1 className="camp-h1">
        <CampaignName id={campaign.id} name={campaign.name} fallback={campaign.caption_input} large />
      </h1>

      <div className="card">
        <small>Your request · {new Date(campaign.created_at).toLocaleDateString()}</small>
        <p style={{ margin: "6px 0 0" }}>{campaign.caption_input}</p>
        <p style={{ margin: "10px 0 0" }}>
          <small>
            {items.length} item{items.length === 1 ? "" : "s"}, each posted on its own
            {autoPost ? ", automatically" : ", by you after review"} · Platforms: {platformLabels || "—"}
            {times.length > 1 && (
              <>
                {" "}
                · first <LocalTime iso={times[0]} />, last <LocalTime iso={times[times.length - 1]} />
              </>
            )}
          </small>
        </p>
        <p style={{ margin: "6px 0 0" }}>
          <small>
            {total.published} published · {total.scheduled} posts scheduled · {total.waiting} waiting to
            be processed
            {total.attention.length > 0 && <> · {total.attention[0]}</>}
          </small>
        </p>
      </div>

      <div className="item-list">
        {items.map((it) => (
          <GroupItem key={it.id} item={it} autoPost={autoPost} />
        ))}
      </div>
      {items.length === 0 && <p>This campaign has no items.</p>}

      <div style={{ marginTop: 48 }}>
        <DeleteCampaignButton
          id={campaign.id}
          disabled={items.some((i) => i.status === "processing")}
        />
      </div>
    </main>
  );
}