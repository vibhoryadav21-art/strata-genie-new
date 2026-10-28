import Link from "next/link";
import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Log in" };

export default async function Login() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/genie/campaigns");

  return (
    <main className="container center">
      <h1>Log in</h1>
      <AuthForm mode="login" />
      <p>
        New here? <Link href="/genie/signup?plan=trial">Start your free trial</Link>
      </p>
    </main>
  );
}