export type UsageEvent = {
  id: string;
  campaign_id: string | null;
  user_id: string | null;
  kind: string;
  provider: string | null;
  model: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  thinking_tokens: number | null;
  neurons_est: number | null;
  cost_usd_est: number | null;
  seconds: number | null;
  ok: boolean;
  error: string | null;
  detail: Record<string, unknown> | null;
  created_at: string;
};

// Cloudflare Workers AI free allowance (per day, resets at 00:00 UTC)
export const FREE_NEURONS_PER_DAY = 10000;

export const num = (v: unknown): number => {
  const n = typeof v === "number" ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

export const fmtInt = (n: number) => Math.round(n).toLocaleString("en-US");

export function fmtUsd(n: number) {
  if (n === 0) return "$0";
  return n < 0.01 ? `$${n.toFixed(4)}` : `$${n.toFixed(2)}`;
}

export function fmtSec(s: number) {
  return s < 90 ? `${s.toFixed(0)} s` : `${(s / 60).toFixed(1)} min`;
}

export function sinceIso(days: number) {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

export function utcMidnightIso() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

export function detailText(detail: Record<string, unknown> | null): string {
  if (!detail) return "";
  return Object.entries(detail)
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join("/") : String(v)}`)
    .join(" · ");
}