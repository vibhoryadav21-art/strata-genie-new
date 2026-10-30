import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ActionButton from "@/components/ActionButton";

export default async function Accounts({
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

  const { data: accounts } = await supabase
    .from("social_accounts")
    .select("id, platform, username, created_at")
    .order("created_at");

  return (
    <main className="container">
      <p>
        <Link href="/strata/genie/campaigns">← Back to dashboard</Link>
      </p>
      <h1>Connected accounts</h1>

      {sp.error && <p className="error">{sp.error}</p>}
      {sp.connected && <p className="success">Account connected.</p>}

      {accounts && accounts.length > 0 ? (
        <table className="table">
          <thead>
            <tr>
              <th>Platform</th>
              <th>Account</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.id}>
                <td style={{ textTransform: "capitalize" }}>{a.platform}</td>
                <td>@{a.username ?? "unknown"}</td>
                <td>
                  <ActionButton
                    url={`/api/social/accounts/${a.id}`}
                    method="DELETE"
                    label="Disconnect"
                    confirmText="Disconnect this account? Scheduled posts for it will be cancelled."
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No accounts connected yet.</p>
      )}

      <p style={{ marginTop: 24 }}>
        {/* Plain link on purpose: this starts a redirect to Instagram */}
        <a href="/api/social/instagram/connect" className="btn">
          Connect an Instagram account
        </a>
      </p>
      <p>
        <small>
          Instagram needs a Professional (Business or Creator) account. You can connect several.
          More platforms are coming.
        </small>
      </p>
    </main>
  );
}