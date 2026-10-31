"use client";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();

  async function logout() {
    await createClient().auth.signOut();
    router.push("/strata/genie");
    router.refresh();
  }

  return (
    <button type="button" className="btn small secondary" onClick={logout}>
      Log out
    </button>
  );
}