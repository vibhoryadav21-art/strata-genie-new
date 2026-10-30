import Link from "next/link";

export default function Home() {
  return (
    <main>
      <section className="hero full">
        <div className="hero-inner">
          <h1>Making communities digitally safe.</h1>
          <p className="lead">
            WhiteCloak Labs is a non-profit initiative working on end-to-end security and
            cybersecurity, and on empowering young people to shape a safer digital world.
          </p>
          <div className="hero-actions">
            <Link href="/strata" className="btn light">
              Explore STRATA
            </Link>
            <a href="#mission" className="btn ghost">
              Our mission
            </a>
          </div>
        </div>
      </section>

      <section id="mission" className="band">
        <h2>Mission and vision</h2>
        <p>
          Our mission is to make communities digitally safe and to empower youth. We imagine a
          digital world where every community can use technology with confidence, and where young
          people have the skills to protect themselves and others.
        </p>
      </section>

      <section className="container">
        <div className="features">
          <div className="card">
            <h3>Security</h3>
            <p>End-to-end security and cybersecurity work that protects people and their data.</p>
          </div>
          <div className="card">
            <h3>Communities</h3>
            <p>Practical help that makes everyday digital life safer for the people around us.</p>
          </div>
          <div className="card">
            <h3>Youth</h3>
            <p>Skills, tools and opportunities for young people to lead on digital safety.</p>
          </div>
        </div>
      </section>

      <section className="products">
        <Link href="/strata" className="product-tile">
          <h2>STRATA</h2>
          <p>
            Our product line. Genie turns photos and videos into ready-to-post social content,
            and more products are on the way.
          </p>
          <span className="more">Explore STRATA</span>
        </Link>
      </section>
    </main>
  );
}