import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPlanStatus } from "@/lib/plans";
import LogoutButton from "@/components/LogoutButton";
import Link from "next/link";

export default async function Dashboard() {
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

  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, caption_input, status, created_at")
    .order("created_at", { ascending: false });

  if (!profile) return <main className="container">Setting up your profile… refresh in a moment.</main>;

  const status = getPlanStatus(profile);

  return (
    <main className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Dashboard</h1>
        <LogoutButton />
      </div>

      <div className="card">
        <p>Signed in as <strong>{profile.email}</strong></p>
        <p>
          Plan: <span className="badge">{profile.plan}</span>
          {profile.plan === "trial" &&
            (status.trialExpired ? " · trial expired" : ` · ${status.daysLeft} day(s) left`)}
        </p>
        <p>
          Posts used: {profile.posts_used_this_period}
          {status.limit !== null ? ` / ${status.limit}` : " (unlimited)"}
        </p>
        
        {status.canPost ? (
          <Link href="/campaigns/new" className="btn">
            New campaign
          </Link>
        ) : (
          <p className="error">Post limit reached or trial expired.</p>
        )}
      </div>

      <h2 style={{ marginTop: 40 }}>History</h2>
      {campaigns && campaigns.length > 0 ? (
        <table className="table">
          <thead>
            <tr><th>Date</th><th>Caption</th><th>Status</th></tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.id}>
                <td>{new Date(c.created_at).toLocaleDateString()}</td>
                <td><Link href={`/campaigns/${c.id}`}>{c.caption_input}</Link></td>
                <td>{c.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No campaigns yet.</p>
      )}
    </main>
  );
}
