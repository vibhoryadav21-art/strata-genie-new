import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Genie" };

export default async function GenieOverview() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main>
      <section className="hero compact">
        <div className="hero-inner">
          <h1>Genie</h1>
          <p className="lead">
            Upload your photos and videos, describe the post you want, and Genie edits them for
            every social platform, then writes the caption and tags for you.
          </p>
          <div className="hero-actions">
            {user ? (
              <>
                <Link href="/strata/genie/campaigns/new" className="btn light">
                  New campaign
                </Link>
                <Link href="/strata/genie/campaigns" className="btn ghost">
                  My campaigns
                </Link>
              </>
            ) : (
              <>
                <Link href="/strata/genie/pricing" className="btn light">
                  Subscribe
                </Link>
                <Link href="/strata/genie/signup?plan=trial" className="btn ghost">
                  Start free trial
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="container">
        <div className="features">
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
        </div>
      </section>
    </main>
  );
}