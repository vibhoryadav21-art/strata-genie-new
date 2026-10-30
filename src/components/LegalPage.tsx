import { LEGAL } from "@/lib/legal";

export default function LegalPage({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="container legal">
      <div className="banner">
        <strong>Draft.</strong> This text is a placeholder and has not been reviewed by a lawyer.
        Items in [BRACKETS] still need to be filled in.
      </div>
      <h1>{title}</h1>
      <p>
        <small>Last updated: {LEGAL.lastUpdated}</small>
      </p>
      {children}
    </main>
  );
}