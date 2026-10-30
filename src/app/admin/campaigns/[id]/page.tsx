/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin, one } from "@/lib/admin";
import { presignView } from "@/lib/r2";
import { kindOf } from "@/lib/platforms";
import ActionButton from "@/components/ActionButton";
import LocalTime from "@/components/LocalTime";

export const metadata = { title: "Admin · Campaign" };

type Thumb = { kind: "image" | "video"; url: string };

async function thumbs(keys: string[]): Promise<Thumb[]> {
  return Promise.all(keys.map(async (k) => ({ kind: kindOf(k), url: await presignView(k) })));
}

function Thumbs({ items }: { items: Thumb[] }) {
  return (
    <div className="thumbs">
      {items.map((t, i) =>
        t.kind === "image" ? (
          <img key={i} className="thumb" src={t.url} alt="" />
        ) : (
          <video key={i} className="thumb" src={t.url} controls preload="metadata" />
        )
      )}
    </div>
  );
}

export default async function AdminCampaign({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*, profiles(email)")
    .eq("id", id)
    .single();
  if (!campaign) notFound();
  const owner = one(campaign.profiles as { email: string }[] | null);

  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, status, attempts, error, created_at")
    .eq("campaign_id", id)
    .order("created_at", { ascending: false });

  const { data: media } = await supabase
    .from("media_assets")
    .select("id, storage_key, type")
    .eq("campaign_id", id)
    .order("created_at");
  const originals = await thumbs((media ?? []).map((m) => m.storage_key));

  const { data: outputs } = await supabase
    .from("outputs")
    .select("id, platform, storage_keys, final_caption, tags, posted_at")
    .eq("campaign_id", id)
    .order("platform");

  const outputThumbs = new Map<string, Thumb[]>();
  for (const o of outputs ?? []) {
    outputThumbs.set(o.id, await thumbs(((o.storage_keys ?? []) as string[]).slice(0, 4)));
  }

  const outputIds = (outputs ?? []).map((o) => o.id);
  const { data: posts } = outputIds.length
    ? await supabase
        .from("post_jobs")
        .select("id, output_id, social_account_id, status, scheduled_for, published_at, error")
        .in("output_id", outputIds)
        .order("created_at", { ascending: false })
    : { data: [] };
  const { data: accounts } = await supabase.from("social_accounts").select("id, username");
  const platformOf = new Map((outputs ?? []).map((o) => [o.id, o.platform]));

  return (
    <main className="container wide">
      <p>
        <Link href="/admin/campaigns">← All campaigns</Link>
      </p>
      <h1>Campaign</h1>

      <div className="card">
        <p style={{ marginTop: 0 }}>
          <strong>{campaign.caption_input}</strong>
        </p>
        <p>
          User: {owner?.email ?? "?"} · Status: <span className="badge">{campaign.status}</span> ·
          Created: <LocalTime iso={campaign.created_at} />
        </p>
        <p>
          Platforms: {(campaign.platforms ?? []).join(", ") || "—"} · Publish mode:{" "}
          {campaign.publish_mode}
          {campaign.publish_at && (
            <>
              {" "}
              at <LocalTime iso={campaign.publish_at} />
            </>
          )}
        </p>
        {campaign.notes && <p>Customer notes: {campaign.notes}</p>}
        {campaign.ai_note && (
          <p className="error">
            <small>AI step failed: {campaign.ai_note}</small>
          </p>
        )}
        <div className="actions-cell">
          {["ready", "failed", "queued"].includes(campaign.status) && (
            <ActionButton
              url={`/api/admin/campaigns/${campaign.id}`}
              label="Re-run"
              confirmText="Process this campaign again? Existing results are replaced."
            />
          )}
          <ActionButton
            url={`/api/admin/campaigns/${campaign.id}`}
            method="DELETE"
            label="Delete"
            className="btn small danger"
            confirmText="Delete this campaign and all its files? This can't be undone."
          />
        </div>
      </div>

      <h2 style={{ marginTop: 32 }}>Original files</h2>
      <Thumbs items={originals} />

      <h2 style={{ marginTop: 32 }}>Results</h2>
      {(outputs ?? []).length === 0 ? (
        <p>No results yet.</p>
      ) : (
        (outputs ?? []).map((o) => (
          <div className="card" key={o.id} style={{ marginBottom: 16 }}>
            <p style={{ marginTop: 0 }}>
              <strong>{o.platform}</strong>
              {o.posted_at && <small> · marked posted</small>}
            </p>
            <Thumbs items={outputThumbs.get(o.id) ?? []} />
            <p style={{ whiteSpace: "pre-wrap" }}>{o.final_caption}</p>
            <p>
              <small>{(o.tags ?? []).map((t: string) => `#${t}`).join(" ")}</small>
            </p>
          </div>
        ))
      )}

      <h2 style={{ marginTop: 32 }}>Posts</h2>
      {(posts ?? []).length === 0 ? (
        <p>No posts scheduled or made.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Version</th>
                <th>Account</th>
                <th>Status</th>
                <th>Scheduled</th>
                <th>Problem</th>
              </tr>
            </thead>
            <tbody>
              {(posts ?? []).map((p) => (
                <tr key={p.id}>
                  <td>{platformOf.get(p.output_id) ?? "?"}</td>
                  <td>
                    @{(accounts ?? []).find((a) => a.id === p.social_account_id)?.username ?? "removed"}
                  </td>
                  <td>{p.status}</td>
                  <td>
                    <LocalTime iso={p.scheduled_for} />
                  </td>
                  <td className="error">{p.error ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 style={{ marginTop: 32 }}>Processing history</h2>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Started</th>
              <th>Status</th>
              <th>Attempts</th>
              <th>Error</th>
            </tr>
          </thead>
          <tbody>
            {(jobs ?? []).map((j) => (
              <tr key={j.id}>
                <td>
                  <LocalTime iso={j.created_at} />
                </td>
                <td>{j.status}</td>
                <td>{j.attempts}</td>
                <td className="error">{j.error ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}