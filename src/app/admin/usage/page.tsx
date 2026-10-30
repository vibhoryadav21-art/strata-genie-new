import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import LocalTime from "@/components/LocalTime";
import {
  FREE_NEURONS_PER_DAY,
  type UsageEvent,
  fmtInt,
  fmtSec,
  fmtUsd,
  num,
  sinceIso,
  utcMidnightIso,
} from "@/lib/usage";

export const metadata = { title: "Admin · Usage" };

const RANGES = [
  { days: 1, label: "24 hours" },
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
];

export default async function AdminUsage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const sp = await searchParams;
  const days = RANGES.some((r) => r.days === Number(sp.days)) ? Number(sp.days) : 7;
  const { supabase } = await requireAdmin();

  const { data } = await supabase
    .from("usage_events")
    .select("*")
    .gte("created_at", sinceIso(days))
    .order("created_at", { ascending: false })
    .limit(5000);
  const events = (data ?? []) as UsageEvent[];

  const { data: todayRows } = await supabase
    .from("usage_events")
    .select("neurons_est")
    .eq("provider", "cloudflare")
    .gte("created_at", utcMidnightIso());
  const neuronsToday = (todayRows ?? []).reduce((s, r) => s + num(r.neurons_est), 0);

  const ai = events.filter((e) => e.kind === "ai");
  const processing = events.filter((e) => e.kind === "processing" && e.ok);
  const totalCost = ai.reduce((s, e) => s + num(e.cost_usd_est), 0);
  const failedCalls = ai.filter((e) => !e.ok).length;
  const avgProcessing = processing.length
    ? processing.reduce((s, e) => s + num(e.seconds), 0) / processing.length
    : 0;

  // By provider and model
  const byModel = new Map<
    string,
    { provider: string; model: string; calls: number; failed: number; inTok: number; outTok: number; neurons: number; cost: number }
  >();
  for (const e of ai) {
    const key = `${e.provider}|${e.model}`;
    const cur = byModel.get(key) ?? {
      provider: e.provider ?? "?",
      model: e.model ?? "?",
      calls: 0,
      failed: 0,
      inTok: 0,
      outTok: 0,
      neurons: 0,
      cost: 0,
    };
    cur.calls++;
    if (!e.ok) cur.failed++;
    cur.inTok += num(e.prompt_tokens);
    cur.outTok += num(e.completion_tokens) + num(e.thinking_tokens);
    cur.neurons += num(e.neurons_est);
    cur.cost += num(e.cost_usd_est);
    byModel.set(key, cur);
  }

  // By day (UTC)
  const byDay = new Map<string, { calls: number; neurons: number; cost: number; seconds: number }>();
  for (const e of events) {
    const day = e.created_at.slice(0, 10);
    const cur = byDay.get(day) ?? { calls: 0, neurons: 0, cost: 0, seconds: 0 };
    if (e.kind === "ai") cur.calls++;
    cur.neurons += num(e.neurons_est);
    cur.cost += num(e.cost_usd_est);
    if (e.kind === "processing") cur.seconds += num(e.seconds);
    byDay.set(day, cur);
  }

  // Most expensive campaigns
  const byCampaign = new Map<string, { cost: number; neurons: number; seconds: number }>();
  for (const e of events) {
    if (!e.campaign_id) continue;
    const cur = byCampaign.get(e.campaign_id) ?? { cost: 0, neurons: 0, seconds: 0 };
    cur.cost += num(e.cost_usd_est);
    cur.neurons += num(e.neurons_est);
    if (e.kind === "processing") cur.seconds += num(e.seconds);
    byCampaign.set(e.campaign_id, cur);
  }
  const top = Array.from(byCampaign.entries())
    .sort((a, b) => b[1].cost - a[1].cost || b[1].seconds - a[1].seconds)
    .slice(0, 10);
  const { data: topCampaigns } = top.length
    ? await supabase
        .from("campaigns")
        .select("id, caption_input")
        .in("id", top.map(([id]) => id))
    : { data: [] };
  const captionOf = new Map((topCampaigns ?? []).map((c) => [c.id, c.caption_input]));

  const failures = events.filter((e) => !e.ok).slice(0, 15);

  return (
    <main className="container wide">
      <h1>Usage and cost</h1>

      <div className="filters">
        {RANGES.map((r) => (
          <Link
            key={r.days}
            href={`/admin/usage?days=${r.days}`}
            className={days === r.days ? "active" : ""}
          >
            Last {r.label}
          </Link>
        ))}
      </div>

      <div className="features">
        <div className="card">
          <small>Neurons today (UTC, estimated)</small>
          <p className="stat">
            {fmtInt(neuronsToday)} <small>/ {fmtInt(FREE_NEURONS_PER_DAY)} free</small>
          </p>
        </div>
        <div className="card">
          <small>Estimated AI cost, last {days} d</small>
          <p className="stat">{fmtUsd(totalCost)}</p>
        </div>
        <div className="card">
          <small>AI calls (failed)</small>
          <p className="stat">
            {ai.length} <small>({failedCalls})</small>
          </p>
        </div>
        <div className="card">
          <small>Avg processing time per campaign</small>
          <p className="stat">{processing.length ? fmtSec(avgProcessing) : "—"}</p>
        </div>
      </div>
      <p>
        <small>
          Tokens come from the AI providers. Neurons and dollars are calculated from the list
          prices in worker/ai.py, so free tiers show a price you would pay on a paid plan. Test
          runs of test_ai.py are not counted. Compare &quot;Neurons today&quot; with your Cloudflare
          dashboard now and then.
        </small>
      </p>

      <h2 style={{ marginTop: 32 }}>By provider and model</h2>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Provider</th>
              <th>Model</th>
              <th>Calls</th>
              <th>Failed</th>
              <th>Tokens in</th>
              <th>Tokens out</th>
              <th>Neurons</th>
              <th>Est. cost</th>
            </tr>
          </thead>
          <tbody>
            {Array.from(byModel.values()).map((m) => (
              <tr key={`${m.provider}|${m.model}`}>
                <td>{m.provider}</td>
                <td>{m.model}</td>
                <td>{m.calls}</td>
                <td className={m.failed ? "error" : ""}>{m.failed}</td>
                <td>{fmtInt(m.inTok)}</td>
                <td>{fmtInt(m.outTok)}</td>
                <td>{m.neurons ? fmtInt(m.neurons) : "—"}</td>
                <td>{fmtUsd(m.cost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {byModel.size === 0 && <p>No AI calls recorded in this period.</p>}

      <h2 style={{ marginTop: 32 }}>Per day (UTC)</h2>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Day</th>
              <th>AI calls</th>
              <th>Neurons</th>
              <th>Est. cost</th>
              <th>Processing time</th>
            </tr>
          </thead>
          <tbody>
            {Array.from(byDay.entries()).map(([day, d]) => (
              <tr key={day}>
                <td>{day}</td>
                <td>{d.calls}</td>
                <td>{d.neurons ? fmtInt(d.neurons) : "—"}</td>
                <td>{fmtUsd(d.cost)}</td>
                <td>{d.seconds ? fmtSec(d.seconds) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 style={{ marginTop: 32 }}>Most expensive campaigns</h2>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Campaign</th>
              <th>Neurons</th>
              <th>Est. cost</th>
              <th>Processing time</th>
            </tr>
          </thead>
          <tbody>
            {top.map(([cid, v]) => (
              <tr key={cid}>
                <td style={{ maxWidth: 360 }}>
                  <Link href={`/admin/campaigns/${cid}`}>{captionOf.get(cid) ?? "(deleted)"}</Link>
                </td>
                <td>{v.neurons ? fmtInt(v.neurons) : "—"}</td>
                <td>{fmtUsd(v.cost)}</td>
                <td>{v.seconds ? fmtSec(v.seconds) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 style={{ marginTop: 32 }}>Recent failures</h2>
      {failures.length === 0 ? (
        <p>No failed AI calls or jobs in this period.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>When</th>
                <th>What</th>
                <th>Error</th>
              </tr>
            </thead>
            <tbody>
              {failures.map((e) => (
                <tr key={e.id}>
                  <td>
                    <LocalTime iso={e.created_at} />
                  </td>
                  <td>
                    {e.kind === "ai" ? `AI · ${e.provider}` : "Processing"}
                    {e.campaign_id && (
                      <>
                        {" "}
                        <Link href={`/admin/campaigns/${e.campaign_id}`}>open</Link>
                      </>
                    )}
                  </td>
                  <td className="error" style={{ maxWidth: 480 }}>
                    <small>{e.error}</small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}