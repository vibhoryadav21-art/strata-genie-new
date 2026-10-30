"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateUserForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [plan, setPlan] = useState("managed");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, plan }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Could not create the user");
    setMessage(`Created ${email}. Share the password with them securely.`);
    setEmail("");
    setPassword("");
    router.refresh();
  }

  return (
    <form onSubmit={create} className="card" style={{ marginBottom: 24 }}>
      <h3 style={{ marginTop: 0 }}>Create a user</h3>
      <div className="actions-cell" style={{ flexWrap: "wrap" }}>
        <input
          className="full"
          style={{ maxWidth: 260 }}
          type="email"
          required
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="full"
          style={{ maxWidth: 220 }}
          type="text"
          required
          minLength={8}
          placeholder="initial password (min 8)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <select className="inline" value={plan} onChange={(e) => setPlan(e.target.value)}>
          <option value="trial">trial</option>
          <option value="basic">basic</option>
          <option value="pro">pro</option>
          <option value="managed">managed</option>
        </select>
        <button className="btn small" type="submit" disabled={busy}>
          {busy ? "Creating…" : "Create"}
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      {message && <p className="success">{message}</p>}
      <small>
        The account is created already confirmed. Password reset by email isn&apos;t built yet, so
        pick a password the user can keep for now.
      </small>
    </form>
  );
}