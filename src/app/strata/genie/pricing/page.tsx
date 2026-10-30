import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Pricing" };

const MAIL = "mailto:hello@example.com?subject="; // replace with your real address

export default async function Pricing() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let current: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .single();
    current = profile?.plan ?? null;
  }
  const loggedIn = !!user;

  function paidAction(plan: "basic" | "pro", label: string) {
    if (current === plan) return <span className="btn secondary muted">Your current plan</span>;
    if (loggedIn) {
      return (
        <a href={`${MAIL}Genie ${label} plan`} className="btn secondary">
          Request {label}
        </a>
      );
    }
    return (
      <Link href={`/strata/genie/signup?plan=${plan}`} className="btn">
        Choose {label}
      </Link>
    );
  }

  return (
    <main className="container">
      <div className="center">
        <h1>Pricing</h1>
        <p>Pick the plan that fits your posting rhythm.</p>
        {loggedIn && (
          <p>
            <small>Online payment is coming soon. Until then, plan changes are made by our team.</small>
          </p>
        )}
      </div>

      <section className="features">
        <div className={current === "basic" ? "card highlight" : "card"}>
          <h3>Basic</h3>
          <div className="price">
            $50 <span>/ month</span>
          </div>
          <ul>
            <li>10 posts per month</li>
            <li>All platforms</li>
            <li>Full history</li>
          </ul>
          {paidAction("basic", "Basic")}
        </div>

        <div className={current === "pro" ? "card highlight" : "card"}>
          <h3>Pro</h3>
          <div className="price">
            $100 <span>/ month</span>
          </div>
          <ul>
            <li>Up to 30 posts per month</li>
            <li>All platforms</li>
            <li>Full history</li>
          </ul>
          {paidAction("pro", "Pro")}
        </div>

        <div className={current === "managed" ? "card highlight" : "card"}>
          <h3>Managed</h3>
          <div className="price">Let's talk</div>
          <ul>
            <li>Dedicated campaign manager</li>
            <li>Custom volume</li>
            <li>Custom pricing</li>
          </ul>
          {current === "managed" ? (
            <span className="btn secondary muted">Your current plan</span>
          ) : (
            <a href={`${MAIL}Genie Managed plan`} className="btn secondary">
              Contact the team
            </a>
          )}
        </div>
      </section>

      {(!loggedIn || current === "trial") && (
        <div className="center" style={{ marginTop: 50 }}>
          {loggedIn ? (
            <>
              <p>You're on the free trial.</p>
              <Link href="/strata/genie/campaigns/new" className="btn secondary">
                Create a campaign
              </Link>
            </>
          ) : (
            <>
              <p>Not sure yet? Try Genie free for 7 days with one post.</p>
              <Link href="/strata/genie/signup?plan=trial" className="btn secondary">
                Start free trial
              </Link>
            </>
          )}
        </div>
      )}
    </main>
  );
}