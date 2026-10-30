import Link from "next/link";

export const metadata = { title: "Erudite" };

export default function Erudite() {
  return (
    <main>
      <section className="hero full">
        <div className="hero-inner">
          <h1>Erudite</h1>
          <p className="lead">Coming soon.</p>
          <div className="hero-actions">
            <Link href="/strata/genie" className="btn ghost">
              See Genie
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}