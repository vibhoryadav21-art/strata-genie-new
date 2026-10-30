import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: { default: "WhiteCloak Labs", template: "%s · WhiteCloak Labs" },
  description:
    "WhiteCloak Labs is a non-profit initiative working on end-to-end security, making communities digitally safe and empowering youth.",
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
        <footer>
          © {new Date().getFullYear()} WhiteCloak Labs. STRATA is a product of WhiteCloak Labs.
        </footer>
      </body>
    </html>
  );
}