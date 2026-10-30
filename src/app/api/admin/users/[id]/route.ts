import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteUserFolder } from "@/lib/r2";

const UUID = /^[0-9a-f-]{36}$/;
const PLANS = ["trial", "basic", "pro", "managed"];
const ROLES = ["user", "admin"];

type Ctx = { params: Promise<{ id: string }> };

// POST /api/admin/users/{id}?action=plan&to=pro | action=role&to=admin | action=reset
export async function POST(request: Request, { params }: Ctx) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Not allowed" }, { status: 403 });

  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Invalid user" }, { status: 400 });

  const url = new URL(request.url);
  const action = url.searchParams.get("action");
  const to = url.searchParams.get("to") ?? "";

  let error: { message: string } | null = null;
  if (action === "plan") {
    if (!PLANS.includes(to)) return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
    ({ error } = await admin.supabase.rpc("admin_set_plan", { p_user_id: id, p_plan: to }));
  } else if (action === "role") {
    if (!ROLES.includes(to)) return NextResponse.json({ error: "Unknown role" }, { status: 400 });
    ({ error } = await admin.supabase.rpc("admin_set_role", { p_user_id: id, p_role: to }));
  } else if (action === "reset") {
    ({ error } = await admin.supabase.rpc("admin_reset_usage", { p_user_id: id }));
  } else {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Not allowed" }, { status: 403 });

  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Invalid user" }, { status: 400 });
  if (id === admin.user.id) {
    return NextResponse.json({ error: "You can't delete your own account here." }, { status: 400 });
  }

  // 1. The user's files. If this fails, nothing else has changed and you can retry.
  try {
    await deleteUserFolder(id);
  } catch {
    return NextResponse.json({ error: "Could not delete the user's files. Try again." }, { status: 500 });
  }

  // 2. The account itself. Their profile, campaigns, posts and accounts are removed with it.
  const { error } = await createAdminClient().auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}