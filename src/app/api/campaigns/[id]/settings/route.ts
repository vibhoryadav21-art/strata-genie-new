import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PLATFORM_INFO } from "@/lib/platforms";

type Ctx = { params: Promise<{ id: string }> };
type Body = { note?: unknown; platforms?: unknown; processAt?: unknown; startNow?: unknown };

async function prepare(request: Request, params: Ctx["params"]) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Not logged in" }, { status: 401 }) };

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return { error: NextResponse.json({ error: "Invalid request" }, { status: 400 }) };
  }

  const note = String(body.note ?? "").trim();
  if (note.length > 500) {
    return {
      error: NextResponse.json({ error: "The note can have at most 500 characters." }, { status: 400 }),
    };
  }
  const platforms = Array.from(
    new Set((Array.isArray(body.platforms) ? body.platforms : []).map((p) => String(p)))
  ).filter((p) => PLATFORM_INFO[p]);
  if (platforms.length === 0) {
    return { error: NextResponse.json({ error: "Keep at least one platform." }, { status: 400 }) };
  }
  return { id, supabase, body, note, platforms };
}

export async function PATCH(request: Request, { params }: Ctx) {
  const p = await prepare(request, params);
  if ("error" in p && p.error) return p.error;
  const { id, supabase, body, note, platforms } = p as Exclude<typeof p, { error: NextResponse }>;

  const when = body.startNow === true ? new Date() : new Date(String(body.processAt ?? ""));
  if (Number.isNaN(when.getTime())) {
    return NextResponse.json({ error: "Pick a valid date and time." }, { status: 400 });
  }

  const { error } = await supabase.rpc("update_item_settings", {
    p_id: id,
    p_note: note,
    p_platforms: platforms,
    p_process_at: when.toISOString(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request, { params }: Ctx) {
  const p = await prepare(request, params);
  if ("error" in p && p.error) return p.error;
  const { id, supabase, note, platforms } = p as Exclude<typeof p, { error: NextResponse }>;

  const { error } = await supabase.rpc("regenerate_item", {
    p_id: id,
    p_note: note,
    p_platforms: platforms,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}