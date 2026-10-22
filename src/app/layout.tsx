import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "STRATA Genie",
  description: "Turn your photos and videos into ready-to-post social content.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header>
          <Link href="/" className="logo">
  {/* eslint-disable-next-line @next/next/no-img-element */}
  <img src="/strata-logo.png" alt="STRATA" height={30} style={{ display: "block" }} />
</Link>
          <Link href="/pricing" className="btn">Subscribe</Link>
        </header>
        {children}
        <footer>© {new Date().getFullYear()} STRATA. All rights reserved.</footer>
      </body>
    </html>
  );
}