import type { Metadata } from "next";
import Link from "next/link";

import "./globals.css";

export const metadata: Metadata = {
  title: "Meal Planner",
  description: "Weekly meal planner with roster, groceries, and history",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="container nav-row">
            <Link href="/" className="brand">
              Meal Planner
            </Link>
            <nav className="nav-links">
              <Link href="/">Generate</Link>
              <Link href="/history">History</Link>
            </nav>
          </div>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
