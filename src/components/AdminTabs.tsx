"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/users", label: "Users", exact: false },
  { href: "/admin/campaigns", label: "Campaigns", exact: false },
  { href: "/admin/usage", label: "Usage", exact: false },
];

export default function AdminTabs() {
  const pathname = usePathname() ?? "";
  return (
    <div className="genie-tabs">
      <nav>
        {TABS.map((t) => {
          const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
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