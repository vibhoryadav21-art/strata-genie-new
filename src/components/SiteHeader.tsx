"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type NavItem = { href: string; label: string; soon?: boolean; muted?: boolean };

const COMPANY_NAV: NavItem[] = [{ href: "/strata", label: "STRATA" }];
const STRATA_NAV: NavItem[] = [
  { href: "/", label: "WhiteCloak Labs", muted: true },
  { href: "/strata/genie", label: "Genie" },
  { href: "/strata/erudite", label: "Erudite", soon: true },
];

// Pages with a full-screen hero: the header is transparent on top of them
const HERO_PAGES = ["/", "/strata", "/strata/erudite"];

function isActive(pathname: string, href: string) {
  if (href === "/") return false;
  return pathname === href || pathname.startsWith(href + "/");
}

export default function SiteHeader({
  loggedIn,
  isAdmin,
}: {
  loggedIn: boolean;
  isAdmin: boolean;
}) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const inStrata = pathname === "/strata" || pathname.startsWith("/strata/");
  const overHero = HERO_PAGES.includes(pathname);
  const nav = inStrata ? STRATA_NAV : COMPANY_NAV;

  async function logout() {
    await createClient().auth.signOut();
    router.push("/strata/genie");
    router.refresh();
  }

  return (
    <header className={overHero ? "site-header" : "site-header solid"}>
      {inStrata ? (
        <Link href="/strata" className="site-logo" aria-label="STRATA home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/strata-logo-white.png" alt="STRATA" />
        </Link>
      ) : (
        <Link href="/" className="site-wordmark">
          WhiteCloak Labs
        </Link>
      )}

      <nav className="site-nav">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={[isActive(pathname, item.href) ? "active" : "", item.muted ? "muted" : ""]
              .join(" ")
              .trim()}
          >
            {item.label}
            {item.soon && <span className="soon">Soon</span>}
          </Link>
        ))}
      </nav>

      <div className="site-actions">
        {loggedIn ? (
          <>
            {isAdmin && <Link href="/admin">Admin</Link>}
            <button type="button" onClick={logout}>
              Log out
            </button>
          </>
        ) : (
          <>
            <Link href="/strata/genie/login">Log in</Link>
            <Link href="/strata/genie/signup?plan=trial" className="site-signup">
              Sign up
            </Link>
          </>
        )}
      </div>
    </header>
  );
}