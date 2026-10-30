import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/admin";
import { deletePrefix } from "@/lib/r2";

const UUID = /^[0-9a-f-]{36}$/;
type Ctx = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Ctx) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Not allowed" }, { status: 403 });

  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Invalid campaign" }, { status: 400 });

  const { error } = await admin.supabase.rpc("admin_requeue_campaign", { p_campaign_id: id });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Not allowed" }, { status: 403 });

  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Invalid campaign" }, { status: 400 });

  const { data: campaign } = await admin.supabase
    .from("campaigns")
    .select("id, user_id")
    .eq("id", id)
    .single();
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    await deletePrefix(`${campaign.user_id}/${campaign.id}/`);
  } catch {
    return NextResponse.json({ error: "Could not delete the files. Try again." }, { status: 500 });
  }

  const { data: deleted, error } = await admin.supabase
    .from("campaigns")
    .delete()
    .eq("id", id)
    .select("id");
  if (error || !deleted || deleted.length === 0) {
    return NextResponse.json({ error: "Could not delete the campaign." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}