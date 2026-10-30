import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
    const origin = process.env.SITE_URL ?? new URL(request.url).origin;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/strata/genie/login`);

  const state = crypto.randomUUID(); // protects against forged callbacks
  const params = new URLSearchParams({
    client_id: process.env.INSTAGRAM_APP_ID!,
    redirect_uri: `${origin}/api/social/instagram/callback`,
    response_type: "code",
    scope: "instagram_business_basic,instagram_business_content_publish",
    state,
  });

  if (new URL(request.url).searchParams.get("debug") === "1") {
    return NextResponse.json({
      url: `https://www.instagram.com/oauth/authorize?${params}`,
    });
  }

  const res = NextResponse.redirect(`https://www.instagram.com/oauth/authorize?${params}`);
  res.cookies.set("ig_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return res;
}