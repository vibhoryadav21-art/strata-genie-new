import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPlanStatus } from "@/lib/plans";
import ActionButton from "@/components/ActionButton";
import LogoutButton from "@/components/LogoutButton";
import LocalTime from "@/components/LocalTime";

export const metadata = { title: "Profile" };

export default async function Profile({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; connected?: string }>;
}) {
  const sp = await searchParams;
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
  if (!profile) {
    return <main className="container">Setting up your profile… refresh in a moment.</main>;
  }
  const status = getPlanStatus(profile);

  const { data: accounts } = await supabase
    .from("social_accounts")
    .select("id, platform, username, created_at")
    .order("created_at");

  return (
    <main className="container">
      <h1>Profile</h1>

      {sp.error && <p className="error">{sp.error}</p>}
      {sp.connected && <p className="success">Account connected.</p>}

      <section className="card profile-card">
        <h3>Account</h3>
        <p>
          <strong>{profile.email}</strong>
        </p>
        <p>
          Member since <LocalTime iso={profile.created_at} />
        </p>
        {profile.role === "admin" && (
          <p>
            <Link href="/admin">Open the admin panel</Link>
          </p>
        )}
      </section>

      <section className="card profile-card">
        <h3>Plan</h3>
        <p>
          <span className="badge">{profile.plan}</span>
          {profile.plan === "trial" &&
            (status.trialExpired ? " · trial expired" : ` · ${status.daysLeft} day(s) left`)}
        </p>
        <p>
          Posts used: {profile.posts_used_this_period}
          {status.limit !== null ? ` / ${status.limit}` : " (unlimited)"}
        </p>
        <Link href="/strata/genie/pricing" className="btn small secondary">
          Compare plans
        </Link>
      </section>

      <section className="card profile-card">
        <h3>Connected accounts</h3>
        {accounts && accounts.length > 0 ? (
          <div className="account-list">
            {accounts.map((a) => (
              <div key={a.id} className="account-row">
                <span>
                  <strong>@{a.username ?? "unknown"}</strong>{" "}
                  <small style={{ textTransform: "capitalize" }}>{a.platform}</small>
                </span>
                <ActionButton
                  url={`/api/social/accounts/${a.id}`}
                  method="DELETE"
                  label="Disconnect"
                  className="btn xs secondary"
                  confirmText="Disconnect this account? Scheduled posts for it will be cancelled."
                />
              </div>
            ))}
          </div>
        ) : (
          <p>No accounts connected yet.</p>
        )}
        <p>
          {/* Plain link on purpose: this starts a redirect to Instagram */}
          <a href="/api/social/instagram/connect" className="btn small">
            Connect an Instagram account
          </a>
        </p>
        <p>
          <small>
            Instagram needs a Professional (Business or Creator) account. You can connect several.
            More platforms are coming.
          </small>
        </p>
      </section>

      <section className="card profile-card">
        <h3>Session and data</h3>
        <div className="actions-cell">
          <LogoutButton />
          <Link href="/data-deletion" className="btn small secondary">
            Delete my data
          </Link>
        </div>
      </section>
    </main>
  );
}