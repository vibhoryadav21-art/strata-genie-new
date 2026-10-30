import Link from "next/link";

export const metadata = { title: "STRATA" };

export default function StrataHome() {
  return (
    <main>
      <section className="hero full">
        <div className="hero-inner">
          <h1>Focused software that does the work for you.</h1>
          <p className="lead">
            STRATA is a product line from WhiteCloak Labs. Our first product, Genie, turns your
            photos and videos into ready-to-post social content.
          </p>
          <div className="hero-actions">
            <Link href="/strata/genie" className="btn light">
              Explore Genie
            </Link>
            <Link href="/strata/erudite" className="btn ghost">
              Erudite, coming soon
            </Link>
          </div>
        </div>
      </section>

      <section className="products">
        <Link href="/strata/genie" className="product-tile">
          <h2>Genie</h2>
          <p>
            Upload your photos and videos, describe the post you want, and Genie edits them for
            every platform and writes the caption and tags.
          </p>
          <span className="more">Explore Genie</span>
        </Link>
        <Link href="/strata/erudite" className="product-tile">
          <h2>Erudite</h2>
          <p>Coming soon.</p>
          <span className="more">Learn more</span>
        </Link>
      </section>
    </main>
  );
}