import Link from "next/link";

export default function Pricing() {
  return (
    <main className="container">
      <div className="center">
        <h1>Pricing</h1>
        <p>Pick the plan that fits your posting rhythm.</p>
      </div>

      <section className="features">
        <div className="card">
          <h3>Basic</h3>
          <div className="price">$50 <span>/ month</span></div>
          <ul><li>10 posts per month</li><li>All platforms</li><li>Full history</li></ul>
          <Link href="/signup?plan=basic" className="btn">Choose Basic</Link>
        </div>

        <div className="card highlight">
          <h3>Pro</h3>
          <div className="price">$100 <span>/ month</span></div>
          <ul><li>Up to 30 posts per month</li><li>All platforms</li><li>Full history</li></ul>
          <Link href="/signup?plan=pro" className="btn">Choose Pro</Link>
        </div>

        <div className="card">
          <h3>Managed</h3>
          <div className="price">Let's talk</div>
          <ul><li>Dedicated campaign manager</li><li>Custom volume</li><li>Custom pricing</li></ul>
          <a href="mailto:hello@example.com" className="btn secondary">Contact the team</a>
        </div>
      </section>

      <div className="center" style={{ marginTop: 50 }}>
        <p>Not sure yet? Try Genie free for 7 days with one post.</p>
        <Link href="/signup?plan=trial" className="btn secondary">Start free trial</Link>
      </div>
    </main>
  );
}