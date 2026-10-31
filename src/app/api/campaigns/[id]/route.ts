import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deletePrefix } from "@/lib/r2";

type Ctx = { params: Promise<{ id: string }> };

// Rename a campaign
export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  let body: { name?: unknown };
  try {
    body = (await request.json()) as { name?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const name = String(body.name ?? "").trim();
  if (name.length > 80) {
    return NextResponse.json({ error: "The name can have at most 80 characters." }, { status: 400 });
  }

  const { error } = await supabase.rpc("rename_campaign", { p_id: id, p_name: name });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

// Delete a campaign and its files
export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  // Row Level Security: only the user's own campaigns can be found.
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, user_id, status")
    .eq("id", id)
    .single();
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (campaign.status === "processing") {
    return NextResponse.json(
      { error: "Genie is working on this campaign right now. Try again when it's finished." },
      { status: 409 }
    );
  }

  // Files first. If this fails, nothing is lost and the user can simply retry.
  try {
    await deletePrefix(`${campaign.user_id}/${campaign.id}/`);
  } catch {
    return NextResponse.json({ error: "Could not delete the files. Please try again." }, { status: 500 });
  }

  const { data: deleted, error } = await supabase
    .from("campaigns")
    .delete()
    .eq("id", id)
    .select("id");
  if (error || !deleted || deleted.length === 0) {
    return NextResponse.json({ error: "Could not delete the campaign." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}