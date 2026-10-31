import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PLATFORM_INFO, composePost } from "@/lib/platforms";

type Ctx = { params: Promise<{ id: string }> };

// Save an edited caption and tags
export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  let body: { caption?: unknown; tags?: unknown };
  try {
    body = (await request.json()) as { caption?: unknown; tags?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const caption = String(body.caption ?? "").trim();
  const rawTags = Array.isArray(body.tags) ? body.tags : [];
  const tags = Array.from(
    new Set(rawTags.map((t) => String(t).replace(/[\s#]/g, "")).filter(Boolean))
  ).slice(0, 30);

  if (!caption) {
    return NextResponse.json({ error: "Caption can't be empty." }, { status: 400 });
  }

  // Row Level Security means this only finds the user's own outputs.
  const { data: output } = await supabase
    .from("outputs")
    .select("platform")
    .eq("id", id)
    .single();
  const info = output ? PLATFORM_INFO[output.platform] : undefined;
  if (!info) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (composePost(caption, tags).length > info.limit || tags.length > info.maxTags) {
    return NextResponse.json({ error: `Too long for ${info.label}.` }, { status: 400 });
  }

  const { error } = await supabase.rpc("update_output_copy", {
    p_output_id: id,
    p_caption: caption,
    p_tags: tags,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}

// Mark an output as posted
export async function POST(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { error } = await supabase.rpc("mark_output_posted", { p_output_id: id });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}

// Remove one platform version
export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { error } = await supabase.rpc("remove_output", { p_output_id: id });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}