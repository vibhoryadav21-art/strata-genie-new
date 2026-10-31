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
  is_group?: boolean;
  parent_id?: string | null;
  process_at?: string | null;
};

export function displayName(name: string | null | undefined, fallback: string): string {
  const n = (name ?? "").trim();
  if (n) return n;
  const f = fallback.trim();
  return f.length > 70 ? f.slice(0, 69).trimEnd() + "…" : f;
}

export type Flags = {
  attention: string[]; // reasons. Empty = nothing needs attention
  active: boolean; // something is scheduled for the future (a post, or processing at a set time)
  posted: boolean;
  ready: boolean;
  processing: boolean;
  waiting: number; // items waiting for their scheduled processing time
  scheduled: number; // posts scheduled or being published
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
  const waiting =
    c.status === "queued" && !!c.process_at && new Date(c.process_at).getTime() > now + 15_000;

  const attention: string[] = [];
  if (c.status === "failed") attention.push("Processing failed");
  if (c.ai_note) attention.push("AI text needs a check");
  if (c.status === "draft" && now - new Date(c.created_at).getTime() > 30 * 60_000) {
    attention.push("Upload didn't finish");
  }
  if (unresolved.length > 0) {
    attention.push(`${unresolved.length} post${unresolved.length > 1 ? "s" : ""} failed`);
  }

  const nexts = [
    ...pending.map((p) => p.scheduled_for),
    ...(waiting && c.process_at ? [c.process_at] : []),
  ].sort();

  return {
    attention,
    active: pending.length > 0 || waiting,
    posted: c.status === "posted" || published.length > 0,
    ready: c.status === "ready",
    processing: c.status === "processing" || (c.status === "queued" && !waiting),
    waiting: waiting ? 1 : 0,
    scheduled: pending.length,
    published: published.length,
    failed: unresolved.length,
    nextAt: nexts[0] ?? null,
  };
}

// A group's flags are the combination of its items' flags
export function aggregateFlags(children: Flags[]): Flags {
  const sum = (f: (x: Flags) => number) => children.reduce((s, x) => s + f(x), 0);
  const needing = children.filter((x) => x.attention.length > 0).length;
  return {
    attention:
      needing > 0 ? [`${needing} item${needing > 1 ? "s" : ""} need${needing > 1 ? "" : "s"} attention`] : [],
    active: children.some((x) => x.active),
    posted: children.some((x) => x.posted),
    ready: children.some((x) => x.ready),
    processing: children.some((x) => x.processing),
    waiting: sum((x) => x.waiting),
    scheduled: sum((x) => x.scheduled),
    published: sum((x) => x.published),
    failed: sum((x) => x.failed),
    nextAt: children.map((x) => x.nextAt).filter((v): v is string => !!v).sort()[0] ?? null,
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

export function matches(filter: FilterKey, f: Flags): boolean {
  switch (filter) {
    case "all":
      return true;
    case "active":
      return f.active;
    case "ready":
      return f.ready;
    case "posted":
      return f.posted;
    case "attention":
      return f.attention.length > 0;
    case "processing":
      return f.processing;
  }
}

export const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  queued: "Waiting",
  processing: "Processing",
  ready: "Ready",
  posted: "Posted",
  failed: "Failed",
  group: "Multi-item",
};