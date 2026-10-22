import Link from "next/link";

export default function Home() {
  return (
    <main className="container">
      <section className="hero">
        <h1>Genie</h1>
        <p>
          Upload your photos and videos, describe the post you want, and Genie
          edits them for every social platform, then writes the caption and
          tags for you.
        </p>
        <Link href="/pricing" className="btn">Subscribe</Link>
      </section>

      <section className="features">
        <div className="card">
          <h3>1. Upload</h3>
          <p>Add your photos and videos and tell Genie in a sentence what you want.</p>
        </div>
        <div className="card">
          <h3>2. Genie edits</h3>
          <p>Crop, colour and frame rate are adjusted automatically for each platform.</p>
        </div>
        <div className="card">
          <h3>3. Review and post</h3>
          <p>Check the result, tweak the caption and tags, and publish in one click.</p>
        </div>
      </section>
    </main>
  );
}