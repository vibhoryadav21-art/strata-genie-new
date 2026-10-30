import "./globals.css";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: { default: "WhiteCloak Labs", template: "%s · WhiteCloak Labs" },
  description:
    "WhiteCloak Labs is a non-profit initiative working on end-to-end security, making communities digitally safe and empowering youth.",
  // Remove this line when you are ready for search engines to list the site
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    isAdmin = profile?.role === "admin";
  }

  return (
    <html lang="en">
      <body>
        <SiteHeader loggedIn={!!user} isAdmin={isAdmin} />
        {children}
        <footer>
          <div className="footer-links">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/cookies">Cookies</Link>
            <Link href="/imprint">Imprint</Link>
            <Link href="/data-deletion">Data deletion</Link>
          </div>
          <div>
            © {new Date().getFullYear()} WhiteCloak Labs. STRATA is a product of WhiteCloak Labs.
          </div>
        </footer>
      </body>
    </html>
  );
}