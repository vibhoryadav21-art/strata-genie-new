"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type Tab = { href: string; label: string };

export default function GenieTabs({ tabs }: { tabs: Tab[] }) {
  const pathname = usePathname() ?? "";
  return (
    <div className="genie-tabs">
      <nav>
        {tabs.map((t) => {
          const active = t.href === "/strata/genie" ? pathname === "/strata/genie" : pathname.startsWith(t.href);
          return (
            <Link key={t.href} href={t.href} className={active ? "active" : ""}>
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}