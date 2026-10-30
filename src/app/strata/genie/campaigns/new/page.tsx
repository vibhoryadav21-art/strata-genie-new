import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPlanStatus } from "@/lib/plans";
import NewCampaignForm from "@/components/NewCampaignForm";
import type { Account } from "@/components/PublishControls";

export const metadata = { title: "New campaign" };

export default async function NewCampaign() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/strata/genie/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (!profile || !getPlanStatus(profile).canPost) redirect("/strata/genie/campaigns");

  const { data: accounts } = await supabase
    .from("social_accounts")
    .select("id, platform, username")
    .order("created_at");

  return (
    <main className="container">
      <h1>New campaign</h1>
      <NewCampaignForm accounts={(accounts ?? []) as Account[]} />
    </main>
  );
}