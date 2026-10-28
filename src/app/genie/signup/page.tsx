import Link from "next/link";
import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Sign up" };

export default async function Signup({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/genie/campaigns");

  return (
    <main className="container center">
      <h1>Create your account</h1>
      <p>Every account starts with a free 7-day trial and one post.</p>
      <AuthForm mode="signup" plan={plan} />
      <p>
        Already have an account? <Link href="/genie/login">Log in</Link>
      </p>
    </main>
  );
}