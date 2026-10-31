import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { data: c } = await supabase.from("campaigns").select("id, is_group").eq("id", id).single();
  if (!c) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const { error } = c.is_group
    ? await supabase.rpc("submit_group", { p_group_id: id })
    : await supabase.rpc("submit_campaign", { p_campaign_id: id });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}