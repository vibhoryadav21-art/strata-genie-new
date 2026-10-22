import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPlanStatus } from "@/lib/plans";
import NewCampaignForm from "@/components/NewCampaignForm";

export default async function NewCampaign() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (!profile || !getPlanStatus(profile).canPost) redirect("/dashboard");

  return (
    <main className="container">
      <h1>New campaign</h1>
      <NewCampaignForm />
    </main>
  );
}