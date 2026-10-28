import { createClient } from "@/lib/supabase/server";
import GenieTabs, { type Tab } from "@/components/GenieTabs";

export default async function GenieLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const tabs: Tab[] = [
    { href: "/genie", label: "Overview" },
    { href: "/genie/pricing", label: "Pricing" },
    ...(user
      ? [
          { href: "/genie/campaigns", label: "Campaigns" },
          { href: "/genie/accounts", label: "Connected accounts" },
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