import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { presignDownload, presignView } from "@/lib/r2";
import {
  PLATFORM_INFO,
  PLATFORM_ORDER,
  accountPlatformOf,
  checkPostable,
  kindOf,
} from "@/lib/platforms";
import OutputCard, { type PostRow } from "@/components/OutputCard";
import PublishControls, { type Account } from "@/components/PublishControls";
import AutoRefresh from "@/components/AutoRefresh";
import DeleteCampaignButton from "@/components/DeleteCampaignButton";
import ActionButton from "@/components/ActionButton";
import CampaignName from "@/components/CampaignName";
import GroupView from "@/components/GroupView";

type Card = {
  id: string;
  platform: string;
  caption: string;
  tags: string[];
  postedAt: string | null;
  files: { kind: "image" | "video"; viewUrl: string; downloadUrl: string }[];
  supported: boolean;
  blockedReason: string | null;
  accounts: Account[];
  posts: PostRow[];
};

type PostDb = {
  id: string;
  output_id: string;
  social_account_id: string | null;
  status: string;
  scheduled_for: string;
  published_at: string | null;
  error: string | null;
};

export default async function CampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/strata/genie/login");

  // Row Level Security: other people's campaigns simply aren't found.
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, name, caption_input, status, created_at, ai_note, is_group, parent_id, platforms")
    .eq("id", id)
    .single();
  if (!campaign) notFound();
  if (campaign.is_group) return <GroupView campaign={campaign} />;

  const reviewable = campaign.status === "ready" || campaign.status === "posted";
  const cards: Card[] = [];
  let hasPending = false;

  if (reviewable) {
    const { data: accountRows } = await supabase
      .from("social_accounts")
      .select("id, platform, username")
      .order("created_at");
    const accounts = (accountRows ?? []) as Account[];

    const { data: outputs } = await supabase
      .from("outputs")
      .select("id, platform, storage_keys, final_caption, tags, posted_at")
      .eq("campaign_id", id);

    const sorted = (outputs ?? [])
      .filter((o) => PLATFORM_INFO[o.platform])
      .sort((a, b) => PLATFORM_ORDER.indexOf(a.platform) - PLATFORM_ORDER.indexOf(b.platform));

    let postRows: PostDb[] = [];
    if (sorted.length > 0) {
      const { data } = await supabase
        .from("post_jobs")
        .select("id, output_id, social_account_id, status, scheduled_for, published_at, error")
        .in("output_id", sorted.map((o) => o.id))
        .order("created_at", { ascending: false });
      postRows = (data ?? []) as PostDb[];
    }
    hasPending = postRows.some((p) => p.status === "scheduled" || p.status === "publishing");

    for (const o of sorted) {
      const keys = (o.storage_keys ?? []) as string[];
      const files = await Promise.all(
        keys.map(async (key, i) => {
          const ext = key.split(".").pop() ?? "";
          return {
            kind: kindOf(key),
            viewUrl: await presignView(key),
            downloadUrl: await presignDownload(key, `strata-${o.platform}-${i + 1}.${ext}`),
          };
        })
      );
      const family = accountPlatformOf(o.platform);
      cards.push({
        id: o.id,
        platform: o.platform,
        caption: o.final_caption ?? "",
        tags: (o.tags ?? []) as string[],
        postedAt: o.posted_at,
        files,
        supported: family !== null,
        blockedReason: family ? checkPostable(o.platform, keys.map(kindOf)) : null,
        accounts: family ? accounts.filter((a) => a.platform === family) : [],
        posts: postRows
          .filter((p) => p.output_id === o.id)
          .map((p) => ({
            id: p.id,
            status: p.status,
            scheduled_for: p.scheduled_for,
            published_at: p.published_at,
            error: p.error,
            username: accounts.find((a) => a.id === p.social_account_id)?.username ?? null,
          })),
      });
    }
  }

  const postableIds = cards.filter((c) => c.supported && !c.blockedReason).map((c) => c.id);
  const allAccounts = Array.from(
    new Map(cards.flatMap((c) => c.accounts).map((a) => [a.id, a])).values()
  );

  return (
    <main className="container">
      <p>
        <Link
          href={
            campaign.parent_id
              ? `/strata/genie/campaigns/${campaign.parent_id}`
              : "/strata/genie/campaigns"
          }
        >
          {campaign.parent_id ? "← Back to the campaign" : "← Back to campaigns"}
        </Link>
      </p>
      <h1 className="camp-h1">
        <CampaignName
          id={campaign.id}
          name={campaign.name}
          fallback={campaign.caption_input}
          large
        />
      </h1>
      <div className="card">
        <small>Your request · {new Date(campaign.created_at).toLocaleDateString()}</small>
        <p style={{ margin: "6px 0 0" }}>{campaign.caption_input}</p>
      </div>

      {(campaign.status === "queued" || campaign.status === "processing") && (
        <>
          <AutoRefresh />
          <div className="card" style={{ marginTop: 24 }}>
            <h3 style={{ marginTop: 0 }}>
              {campaign.status === "queued" ? "Waiting in line…" : "Genie is working on it…"}
            </h3>
            <p>
              This can take a little while. You can leave this page and come back later. It
              refreshes by itself.
            </p>
          </div>
        </>
      )}

      {hasPending && <AutoRefresh seconds={15} />}

      {campaign.status === "failed" && (
        <div className="card" style={{ marginTop: 24 }}>
          <h3 style={{ marginTop: 0 }}>Something went wrong</h3>
          <p>We couldn't process this campaign. You can try again, or delete it.</p>
          <ActionButton
            url={`/api/campaigns/${campaign.id}/regenerate`}
            label="Try again"
            className="btn small"
          />
        </div>
      )}

      {campaign.status === "draft" && (
        <div className="card" style={{ marginTop: 24 }}>
          <h3 style={{ marginTop: 0 }}>Upload not finished</h3>
          <p>The files for this campaign didn't finish uploading. Please create a new campaign.</p>
        </div>
      )}

      {reviewable && (
        <section style={{ marginTop: 32 }}>
          <h2>Review and post</h2>
          <p>
            Check each version and adjust the text. Save your changes, then publish from here, or
            download the file and post it yourself.
          </p>

          {campaign.ai_note && (
            <div className="banner">
              <p style={{ margin: "0 0 8px" }}>
                Genie's AI couldn't be used for this campaign, so the text below is only a basic
                version, and nothing was posted automatically. You can edit it yourself, try
                again, or keep it as it is.
              </p>
              <div className="actions-cell">
                <ActionButton
                  url={`/api/campaigns/${campaign.id}/regenerate`}
                  label="Regenerate with AI"
                  className="btn small"
                />
                <ActionButton
                  url={`/api/campaigns/${campaign.id}/dismiss-note`}
                  label="Keep this text"
                />
              </div>
            </div>
          )}

          {postableIds.length > 0 && (
            <div className="card" style={{ marginBottom: 24 }}>
              <h3 style={{ marginTop: 0 }}>Publish everywhere</h3>
              <p style={{ marginTop: 0 }}>
                <small>
                  Posts every version that has a connected account (saved captions only).
                </small>
              </p>
              <PublishControls
                outputIds={postableIds}
                accounts={allAccounts}
                buttonLabel="Post to all"
              />
            </div>
          )}

          {cards.map((c) => (
            <OutputCard
              key={c.id}
              id={c.id}
              platform={c.platform}
              files={c.files}
              initialCaption={c.caption}
              initialTags={c.tags}
              postedAt={c.postedAt}
              supported={c.supported}
              blockedReason={c.blockedReason}
              accounts={c.accounts}
              posts={c.posts}
              removable={cards.length > 1}
            />
          ))}
        </section>
      )}

      <div style={{ marginTop: 48 }}>
        <DeleteCampaignButton id={campaign.id} disabled={campaign.status === "processing"} />
      </div>
    </main>
  );
}