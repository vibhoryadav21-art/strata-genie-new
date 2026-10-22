import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { presignUpload } from "@/lib/r2";
import { TYPE_INFO, MAX_CAPTION, validateFiles } from "@/lib/uploads";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  let body: { caption?: unknown; files?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const caption = String(body.caption ?? "").trim();
  if (!caption || caption.length > MAX_CAPTION) {
    return NextResponse.json(
      { error: `Caption must be 1-${MAX_CAPTION} characters.` },
      { status: 400 }
    );
  }

  const files = (Array.isArray(body.files) ? body.files : []).map(
    (f: { type?: unknown; size?: unknown }) => ({
      type: String(f?.type ?? ""),
      size: Number(f?.size ?? 0),
    })
  );
  const problem = validateFiles(files);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  // The database trigger enforces the trial and plan limits here.
  const { data: campaign, error } = await supabase
    .from("campaigns")
    .insert({ user_id: user.id, caption_input: caption })
    .select("id")
    .single();
  if (error || !campaign) {
    return NextResponse.json(
      { error: error?.message ?? "Could not create campaign" },
      { status: 403 }
    );
  }

  const rows: { campaign_id: string; storage_key: string; type: string }[] = [];
  const uploads: { key: string; contentType: string; url: string }[] = [];
  for (const f of files) {
    const info = TYPE_INFO[f.type];
    const key = `${user.id}/${campaign.id}/${crypto.randomUUID()}.${info.ext}`;
    rows.push({ campaign_id: campaign.id, storage_key: key, type: info.kind });
    uploads.push({ key, contentType: f.type, url: await presignUpload(key, f.type) });
  }

  const { error: mediaError } = await supabase.from("media_assets").insert(rows);
  if (mediaError) {
    return NextResponse.json({ error: mediaError.message }, { status: 500 });
  }

  return NextResponse.json({ campaignId: campaign.id, uploads });
}