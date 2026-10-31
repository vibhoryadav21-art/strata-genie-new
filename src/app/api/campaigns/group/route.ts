import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { presignUpload } from "@/lib/r2";
import { TYPE_INFO, MAX_CAPTION, MAX_ITEMS, validateFiles } from "@/lib/uploads";
import { PLATFORM_INFO } from "@/lib/platforms";

type RawFile = { name?: unknown; type?: unknown; size?: unknown };
type Body = {
  name?: unknown;
  caption?: unknown;
  notes?: unknown;
  platforms?: unknown;
  publishMode?: unknown;
  startAt?: unknown;
  intervalMinutes?: unknown;
  accountIds?: unknown;
  files?: unknown;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const caption = String(body.caption ?? "").trim();
  const notes = String(body.notes ?? "").trim().slice(0, MAX_CAPTION);
  const name = String(body.name ?? "").trim().slice(0, 80);
  if (!caption || caption.length > MAX_CAPTION) {
    return NextResponse.json(
      { error: `Your request must be 1-${MAX_CAPTION} characters.` },
      { status: 400 }
    );
  }

  const platforms = Array.from(
    new Set((Array.isArray(body.platforms) ? body.platforms : []).map((p) => String(p)))
  ).filter((p) => PLATFORM_INFO[p]);
  if (platforms.length === 0) {
    return NextResponse.json({ error: "Choose at least one platform." }, { status: 400 });
  }

  const raw = (Array.isArray(body.files) ? body.files : []) as RawFile[];
  const files = raw.map((f) => ({
    name: String(f?.name ?? "").replace(/\.[^.]+$/, "").trim().slice(0, 80),
    type: String(f?.type ?? ""),
    size: Number(f?.size ?? 0),
  }));
  const problem = validateFiles(files, MAX_ITEMS);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  // manual = process everything now, the customer posts later
  // now / scheduled = process at the given times, then post automatically
  const mode = ["manual", "now", "scheduled"].includes(String(body.publishMode))
    ? String(body.publishMode)
    : "manual";
  const interval = Math.round(Number(body.intervalMinutes ?? 0));
  let accountIds: string[] = [];
  let startMs = Date.now();

  if (mode !== "manual") {
    const ids = (Array.isArray(body.accountIds) ? body.accountIds : []).map(String).slice(0, 10);
    // Row Level Security: only the user's own accounts come back.
    const { data: owned } = await supabase.from("social_accounts").select("id").in("id", ids);
    accountIds = (owned ?? []).map((a) => String(a.id));
    if (accountIds.length === 0) {
      return NextResponse.json({ error: "Choose a connected account to post to." }, { status: 400 });
    }
    if (mode === "scheduled") {
      startMs = new Date(String(body.startAt ?? "")).getTime();
      if (Number.isNaN(startMs) || startMs < Date.now() - 60_000) {
        return NextResponse.json({ error: "Choose a start time in the future." }, { status: 400 });
      }
    }
    if (files.length > 1 && (!Number.isFinite(interval) || interval < 5 || interval > 10080)) {
      return NextResponse.json({ error: "Choose a valid interval." }, { status: 400 });
    }
    const lastMs = startMs + (files.length - 1) * Math.max(interval, 0) * 60_000;
    if (lastMs > Date.now() + 60 * 86_400_000) {
      return NextResponse.json(
        { error: "The last item would be more than 60 days away. Use a shorter interval." },
        { status: 400 }
      );
    }
  }

  const groupId = crypto.randomUUID();
  const nowMs = Date.now();
  const items = files.map((f, i) => {
    const id = crypto.randomUUID();
    const info = TYPE_INFO[f.type];
    return {
      id,
      name: f.name || `Item ${i + 1}`,
      key: `${user.id}/${id}/${crypto.randomUUID()}.${info.ext}`,
      type: info.kind,
      contentType: f.type,
      process_at: new Date(
        mode === "manual" ? nowMs : startMs + i * Math.max(interval, 0) * 60_000
      ).toISOString(),
      position: i,
    };
  });

  // One database call creates the group and all items (or none). The plan limit counts every item.
  const { error } = await supabase.rpc("create_group_campaign", {
    p_group_id: groupId,
    p_name: name,
    p_request: caption,
    p_notes: notes,
    p_platforms: platforms,
    p_publish_mode: mode === "manual" ? "manual" : "now",
    p_account_ids: accountIds,
    p_items: items.map((it) => ({
      id: it.id,
      name: it.name,
      key: it.key,
      type: it.type,
      process_at: it.process_at,
      position: it.position,
    })),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 403 });

  const uploads: { id: string; url: string }[] = [];
  for (const it of items) {
    uploads.push({ id: it.id, url: await presignUpload(it.key, it.contentType) });
  }

  return NextResponse.json({ groupId, items: uploads });
}