// Rough limits for the editor. We'll verify each platform's real rules per platform later.
// Keep the keys identical to PLATFORMS in worker/worker.py.
export const PLATFORM_INFO: Record<
  string,
  { label: string; format: string; limit: number; maxTags: number }
> = {
  instagram_reels: { label: "Instagram Reels", format: "9:16", limit: 2200, maxTags: 30 },
  tiktok: { label: "TikTok", format: "9:16", limit: 2200, maxTags: 15 },
  instagram_feed: { label: "Instagram feed", format: "4:5", limit: 2200, maxTags: 30 },
  threads: { label: "Threads", format: "4:5", limit: 500, maxTags: 5 },
  x: { label: "X (Twitter)", format: "16:9", limit: 280, maxTags: 5 },
  facebook: { label: "Facebook", format: "16:9", limit: 5000, maxTags: 10 },
};

export const PLATFORM_ORDER = Object.keys(PLATFORM_INFO);

export function composePost(caption: string, tags: string[]): string {
  const hashtags = tags.map((t) => `#${t}`).join(" ");
  return hashtags ? `${caption}\n\n${hashtags}` : caption;
}

export function parseTags(text: string): string[] {
  return Array.from(new Set(text.split(/[\s,#]+/).filter(Boolean)));
}

// Which kind of connected account can publish this version? null = not supported yet.
export function accountPlatformOf(platform: string): string | null {
  if (platform.startsWith("instagram_")) return "instagram";
  return null;
}

export function kindOf(storageKey: string): "image" | "video" {
  return storageKey.toLowerCase().endsWith(".mp4") ? "video" : "image";
}

// Returns a reason if this version can't be posted, otherwise null.
export function checkPostable(platform: string, kinds: ("image" | "video")[]): string | null {
  if (platform === "instagram_reels" && (kinds.length !== 1 || kinds[0] !== "video")) {
    return "Instagram Reels need exactly one video.";
  }
  if (platform === "instagram_feed" && (kinds.length < 1 || kinds.length > 10)) {
    return "Instagram posts need between 1 and 10 files.";
  }
  return null;
}