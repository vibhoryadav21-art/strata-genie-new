import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PLATFORM_INFO, accountPlatformOf, checkPostable, kindOf } from "@/lib/platforms";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  let body: { outputIds?: unknown; accountIds?: unknown; scheduledFor?: unknown };
  try {
    body = (await request.json()) as {
      outputIds?: unknown;
      accountIds?: unknown;
      scheduledFor?: unknown;
    };
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const outputIds = (Array.isArray(body.outputIds) ? body.outputIds : []).map(String).slice(0, 12);
  const accountIds = (Array.isArray(body.accountIds) ? body.accountIds : []).map(String).slice(0, 10);
  if (outputIds.length === 0 || accountIds.length === 0) {
    return NextResponse.json({ error: "Choose what to post and where." }, { status: 400 });
  }

  const when = body.scheduledFor ? new Date(String(body.scheduledFor)) : new Date();
  if (Number.isNaN(when.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  // Row Level Security: only the user's own outputs and accounts are found.
  const { data: outputs } = await supabase
    .from("outputs")
    .select("id, platform, storage_keys")
    .in("id", outputIds);
  const { data: accounts } = await supabase
    .from("social_accounts")
    .select("id, platform, username")
    .in("id", accountIds);

  let created = 0;
  const problems = new Set<string>();

  for (const o of outputs ?? []) {
    const family = accountPlatformOf(o.platform);
    if (!family) continue;
    const label = PLATFORM_INFO[o.platform]?.label ?? o.platform;

    const kinds = ((o.storage_keys ?? []) as string[]).map(kindOf);
    const issue = checkPostable(o.platform, kinds);
    if (issue) {
      problems.add(`${label}: ${issue}`);
      continue;
    }

    for (const a of (accounts ?? []).filter((acc) => acc.platform === family)) {
      const { error } = await supabase.rpc("schedule_post", {
        p_output_id: o.id,
        p_account_id: a.id,
        p_when: when.toISOString(),
      });
      if (error) problems.add(`${label} → @${a.username ?? "account"}: ${error.message}`);
      else created++;
    }
  }

  return NextResponse.json({ created, problems: Array.from(problems) });
}