import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: { default: "STRATA", template: "%s · STRATA" },
  description:
    "STRATA builds focused software products. Genie turns photos and videos into ready-to-post social content.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <body>
        <SiteHeader loggedIn={!!user} />
        {children}
        <footer>© {new Date().getFullYear()} STRATA. All rights reserved.</footer>
      </body>
    </html>
  );
}