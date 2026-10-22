export const TYPE_INFO: Record<string, { kind: "image" | "video"; ext: string }> = {
  "image/jpeg": { kind: "image", ext: "jpg" },
  "image/png": { kind: "image", ext: "png" },
  "image/webp": { kind: "image", ext: "webp" },
  "video/mp4": { kind: "video", ext: "mp4" },
  "video/quicktime": { kind: "video", ext: "mov" },
};

export const MAX_FILES = 10;
export const MAX_CAPTION = 500;
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 300 * 1024 * 1024;

export function validateFiles(files: { type: string; size: number }[]): string | null {
  if (files.length === 0) return "Add at least one photo or video.";
  if (files.length > MAX_FILES) return `Maximum ${MAX_FILES} files per campaign.`;
  for (const f of files) {
    const info = TYPE_INFO[f.type];
    if (!info) return "Only JPG, PNG, WebP, MP4 and MOV files are allowed.";
    if (!(f.size > 0)) return "One of the files is empty.";
    const max = info.kind === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
    if (f.size > max) return `A ${info.kind} is larger than the ${max / 1024 / 1024} MB limit.`;
  }
  return null;
}