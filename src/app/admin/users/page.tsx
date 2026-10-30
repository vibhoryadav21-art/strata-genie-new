import { requireAdmin } from "@/lib/admin";
import { POST_LIMITS, type Plan } from "@/lib/plans";
import PlanSelect from "@/components/PlanSelect";
import CreateUserForm from "@/components/CreateUserForm";
import ActionButton from "@/components/ActionButton";
import LocalTime from "@/components/LocalTime";

export const metadata = { title: "Admin · Users" };

export default async function AdminUsers() {
  const { supabase, user } = await requireAdmin();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, role, plan, trial_ends_at, posts_used_this_period, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  const { data: camps } = await supabase.from("campaigns").select("user_id").limit(5000);
  const counts = new Map<string, number>();
  for (const c of camps ?? []) counts.set(c.user_id, (counts.get(c.user_id) ?? 0) + 1);

  return (
    <main className="container wide">
      <h1>Users</h1>
      <CreateUserForm />

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Plan</th>
              <th>Usage</th>
              <th>Trial ends</th>
              <th>Campaigns</th>
              <th>Role</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(profiles ?? []).map((p) => {
              const limit = POST_LIMITS[p.plan as Plan];
              const isMe = p.id === user.id;
              return (
                <tr key={p.id}>
                  <td>
                    {p.email}
                    {isMe && <small> (you)</small>}
                  </td>
                  <td>
                    <PlanSelect userId={p.id} plan={p.plan} />
                  </td>
                  <td>
                    {p.posts_used_this_period} / {limit === null || limit === undefined ? "∞" : limit}
                  </td>
                  <td>{p.plan === "trial" && p.trial_ends_at ? <LocalTime iso={p.trial_ends_at} /> : "—"}</td>
                  <td>{counts.get(p.id) ?? 0}</td>
                  <td>{p.role}</td>
                  <td>
                    <LocalTime iso={p.created_at} />
                  </td>
                  <td>
                    <div className="actions-cell">
                      <ActionButton
                        url={`/api/admin/users/${p.id}?action=reset`}
                        label="Reset usage"
                        confirmText="Reset this user's post counter to 0?"
                      />
                      {!isMe && (
                        <>
                          <ActionButton
                            url={`/api/admin/users/${p.id}?action=role&to=${p.role === "admin" ? "user" : "admin"}`}
                            label={p.role === "admin" ? "Remove admin" : "Make admin"}
                            confirmText={`Change this user's role to ${p.role === "admin" ? "user" : "admin"}?`}
                          />
                          <ActionButton
                            url={`/api/admin/users/${p.id}`}
                            method="DELETE"
                            label="Delete"
                            className="btn small danger"
                            confirmText={`Delete ${p.email} with all their campaigns and files? This can't be undone.`}
                          />
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}