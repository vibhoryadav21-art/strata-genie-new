import { createClient } from "@/lib/supabase/server";
import GenieTabs, { type Tab } from "@/components/GenieTabs";

export default async function GenieLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const tabs: Tab[] = [
    { href: "/strata/genie", label: "Overview" },
    { href: "/strata/genie/pricing", label: "Pricing" },
    ...(user
      ? [
          { href: "/strata/genie/campaigns", label: "Campaigns" },
          { href: "/strata/genie/profile", label: "Profile" },
        ]
      : []),
  ];

  return (
    <>
      <GenieTabs tabs={tabs} />
      {children}
    </>
  );
}