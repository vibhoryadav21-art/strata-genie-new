"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const LINKS = [
  { href: "/genie", label: "Genie", soon: false },
  { href: "/erudite", label: "Erudite", soon: true },
];

export default function SiteHeader({ loggedIn }: { loggedIn: boolean }) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  // Transparent over the full-screen hero on these pages, solid everywhere else
  const overHero = pathname === "/" || pathname === "/erudite";

  async function logout() {
    await createClient().auth.signOut();
    router.push("/genie");
    router.refresh();
  }

  return (
    <header className={overHero ? "site-header" : "site-header solid"}>
      <Link href="/" className="site-logo" aria-label="STRATA home">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/strata-logo-white.png" alt="STRATA" />
      </Link>
      <nav className="site-nav">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={pathname === l.href || pathname.startsWith(l.href + "/") ? "active" : ""}
          >
            {l.label}
            {l.soon && <span className="soon">Soon</span>}
          </Link>
        ))}
      </nav>

      <div className="site-actions">
        {loggedIn ? (
          <button type="button" onClick={logout}>
            Log out
          </button>
        ) : (
          <>
            <Link href="/genie/login">Log in</Link>
            <Link href="/genie/signup?plan=trial" className="site-signup">
              Sign up
            </Link>
          </>
        )}
      </div>
    </header>
  );
}