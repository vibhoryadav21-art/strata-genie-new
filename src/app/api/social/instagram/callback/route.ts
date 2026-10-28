import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { encryptToken } from "@/lib/crypto";

type ShortToken = {
  access_token?: string;
  data?: { access_token?: string }[];
  error_message?: string;
};
type LongToken = { access_token?: string; expires_in?: number; error?: { message?: string } };
type Profile = { user_id?: string | number; id?: string | number; username?: string };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = process.env.SITE_URL ?? url.origin;
  const redirectUri = `${origin}/api/social/instagram/callback`;
  const back = (msg: string) =>
    NextResponse.redirect(`${origin}/genie/accounts?error=${encodeURIComponent(msg)}`);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/genie/login`);

  if (url.searchParams.get("error")) return back("The Instagram connection was cancelled.");

  const code = (url.searchParams.get("code") ?? "").replace(/#_$/, "");
  const state = url.searchParams.get("state");
  const cookieState = (await cookies()).get("ig_oauth_state")?.value;
  if (!code || !state || !cookieState || state !== cookieState) {
    return back("Security check failed. Please try again.");
  }

  const clientId = process.env.INSTAGRAM_APP_ID!;
  const clientSecret = process.env.INSTAGRAM_APP_SECRET!;

  try {
    // 1. Authorization code -> short-lived token (1 hour)
    const r1 = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code,
      }),
    });
    const j1 = (await r1.json()) as ShortToken;
    const shortToken = j1.data?.[0]?.access_token ?? j1.access_token;
    if (!r1.ok || !shortToken) {
      throw new Error(j1.error_message ?? "Instagram refused the login.");
    }

    // 2. Short-lived -> long-lived token (60 days)
    const r2 = await fetch(
      `https://graph.instagram.com/access_token?${new URLSearchParams({
        grant_type: "ig_exchange_token",
        client_secret: clientSecret,
        access_token: shortToken,
      })}`
    );
    const j2 = (await r2.json()) as LongToken;
    if (!r2.ok || !j2.access_token) {
      throw new Error(j2.error?.message ?? "Could not get a long-lived token.");
    }

    // 3. Who is this?
    const r3 = await fetch(
      `https://graph.instagram.com/v24.0/me?${new URLSearchParams({
        fields: "user_id,username",
        access_token: j2.access_token,
      })}`
    );
    const j3 = (await r3.json()) as Profile;
    const externalId = String(j3.user_id ?? j3.id ?? "");
    if (!r3.ok || !externalId) throw new Error("Could not read your Instagram profile.");

    const expiresAt = new Date(Date.now() + (j2.expires_in ?? 5183944) * 1000).toISOString();

    const { error } = await supabase.rpc("connect_social_account", {
      p_platform: "instagram",
      p_external_id: externalId,
      p_username: j3.username ?? null,
      p_token_encrypted: await encryptToken(j2.access_token),
      p_expires_at: expiresAt,
    });
    if (error) throw new Error(error.message);
  } catch (e) {
    return back(e instanceof Error ? e.message : "Could not connect Instagram.");
  }

  const res = NextResponse.redirect(`${origin}/genie/accounts?connected=1`);
  res.cookies.delete("ig_oauth_state");
  return res;
}