export type PostLite = {
  id: string;
  output_id: string;
  social_account_id: string | null;
  status: string;
  scheduled_for: string;
  published_at: string | null;
  error: string | null;
  created_at: string;
};

export type CampaignLite = {
  id: string;
  name: string | null;
  caption_input: string;
  status: string;
  created_at: string;
  ai_note: string | null;
};

export function displayName(name: string | null | undefined, fallback: string): string {
  const n = (name ?? "").trim();
  if (n) return n;
  const f = fallback.trim();
  return f.length > 70 ? f.slice(0, 69).trimEnd() + "…" : f;
}

export type Flags = {
  attention: string[]; // reasons. Empty = nothing needs attention
  active: boolean;
  posted: boolean;
  scheduled: number;
  published: number;
  failed: number; // failed posts nobody has dealt with yet
  nextAt: string | null;
};

const LIVE = ["scheduled", "publishing", "published"];

export function computeFlags(c: CampaignLite, posts: PostLite[], now = Date.now()): Flags {
  // A failed post is "handled" once a newer post for the same version and account is live
  const unresolved = posts.filter(
    (p) =>
      p.status === "failed" &&
      !posts.some(
        (q) =>
          q.id !== p.id &&
          q.output_id === p.output_id &&
          q.social_account_id === p.social_account_id &&
          q.created_at > p.created_at &&
          LIVE.includes(q.status)
      )
  );
  const pending = posts.filter((p) => p.status === "scheduled" || p.status === "publishing");
  const published = posts.filter((p) => p.status === "published");

  const attention: string[] = [];
  if (c.status === "failed") attention.push("Processing failed");
  if (c.ai_note) attention.push("AI text needs a check");
  if (c.status === "draft" && now - new Date(c.created_at).getTime() > 30 * 60_000) {
    attention.push("Upload didn't finish");
  }
  if (unresolved.length > 0) {
    attention.push(`${unresolved.length} post${unresolved.length > 1 ? "s" : ""} failed`);
  }

  return {
    attention,
    active: pending.length > 0,
    posted: c.status === "posted" || published.length > 0,
    scheduled: pending.length,
    published: published.length,
    failed: unresolved.length,
    nextAt: pending.map((p) => p.scheduled_for).sort()[0] ?? null,
  };
}

export const FILTERS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "ready", label: "Ready" },
  { key: "posted", label: "Posted" },
  { key: "attention", label: "Needs attention" },
  { key: "processing", label: "Processing" },
] as const;

export type FilterKey = (typeof FILTERS)[number]["key"];

export function matches(filter: FilterKey, c: CampaignLite, f: Flags): boolean {
  switch (filter) {
    case "all":
      return true;
    case "active":
      return f.active;
    case "ready":
      return c.status === "ready";
    case "posted":
      return f.posted;
    case "attention":
      return f.attention.length > 0;
    case "processing":
      return c.status === "queued" || c.status === "processing";
  }
}

export const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  queued: "Waiting",
  processing: "Processing",
  ready: "Ready",
  posted: "Posted",
  failed: "Failed",
};