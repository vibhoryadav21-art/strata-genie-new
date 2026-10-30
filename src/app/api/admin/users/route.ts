import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

const PLANS = ["trial", "basic", "pro", "managed"];

export async function POST(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Not allowed" }, { status: 403 });

  let body: { email?: unknown; password?: unknown; plan?: unknown };
  try {
    body = (await request.json()) as { email?: unknown; password?: unknown; plan?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const plan = String(body.plan ?? "trial");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "The password needs at least 8 characters." }, { status: 400 });
  }
  if (!PLANS.includes(plan)) {
    return NextResponse.json({ error: "Unknown plan." }, { status: 400 });
  }

  const { data, error } = await createAdminClient().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) {
    return NextResponse.json({ error: error?.message ?? "Could not create the user" }, { status: 400 });
  }

  // The profile (with a 7-day trial) is created automatically; set the chosen plan.
  if (plan !== "trial") {
    const { error: planError } = await admin.supabase.rpc("admin_set_plan", {
      p_user_id: data.user.id,
      p_plan: plan,
    });
    if (planError) {
      return NextResponse.json(
        { error: `User created, but the plan could not be set: ${planError.message}` },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ ok: true, id: data.user.id });
}