import { requireAdmin } from "@/lib/admin";
import AdminTabs from "@/components/AdminTabs";

export const metadata = { title: "Admin", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <>
      <AdminTabs />
      {children}
    </>
  );
}