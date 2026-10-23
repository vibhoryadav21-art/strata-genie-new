import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { presignDownload, presignView } from "@/lib/r2";
import { PLATFORM_INFO, PLATFORM_ORDER } from "@/lib/platforms";
import OutputCard from "@/components/OutputCard";
import AutoRefresh from "@/components/AutoRefresh";
import DeleteCampaignButton from "@/components/DeleteCampaignButton";

type Card = {
  id: string;
  platform: string;
  caption: string;
  tags: string[];
  postedAt: string | null;
  files: { kind: "image" | "video"; viewUrl: string; downloadUrl: string }[];
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
  if (!user) redirect("/login");

  // Row Level Security: other people's campaigns simply aren't found.
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, caption_input, status, created_at")
    .eq("id", id)
    .single();
  if (!campaign) notFound();

  const reviewable = campaign.status === "ready" || campaign.status === "posted";
  const cards: Card[] = [];

  if (reviewable) {
    const { data: outputs } = await supabase
      .from("outputs")
      .select("id, platform, storage_keys, final_caption, tags, posted_at")
      .eq("campaign_id", id);

    const sorted = (outputs ?? [])
      .filter((o) => PLATFORM_INFO[o.platform])
      .sort((a, b) => PLATFORM_ORDER.indexOf(a.platform) - PLATFORM_ORDER.indexOf(b.platform));

    for (const o of sorted) {
      const keys = (o.storage_keys ?? []) as string[];
      const files = await Promise.all(
        keys.map(async (key, i) => {
          const ext = key.split(".").pop() ?? "";
          const kind: "image" | "video" = ext === "mp4" ? "video" : "image";
          return {
            kind,
            viewUrl: await presignView(key),
            downloadUrl: await presignDownload(key, `strata-${o.platform}-${i + 1}.${ext}`),
          };
        })
      );
      cards.push({
        id: o.id,
        platform: o.platform,
        caption: o.final_caption ?? "",
        tags: (o.tags ?? []) as string[],
        postedAt: o.posted_at,
        files,
      });
    }
  }

  return (
    <main className="container">
      <p>
        <Link href="/dashboard">← Back to dashboard</Link>
      </p>
      <h1>Your campaign</h1>
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

      {campaign.status === "failed" && (
        <div className="card" style={{ marginTop: 24 }}>
          <h3 style={{ marginTop: 0 }}>Something went wrong</h3>
          <p>We couldn't process this campaign. Please try again, or contact support.</p>
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
            Check each version, adjust the text if you like, then download the file and post it,
            or copy the caption and tags.
          </p>
          {cards.map((c) => (
            <OutputCard
              key={c.id}
              id={c.id}
              platform={c.platform}
              files={c.files}
              initialCaption={c.caption}
              initialTags={c.tags}
              postedAt={c.postedAt}
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