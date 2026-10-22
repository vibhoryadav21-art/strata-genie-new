import Link from "next/link";
import AuthForm from "@/components/AuthForm";

export default function Login() {
  return (
    <main className="container center">
      <h1>Log in</h1>
      <AuthForm mode="login" />
      <p>
        New here? <Link href="/signup?plan=trial">Start your free trial</Link>
      </p>
    </main>
  );
}