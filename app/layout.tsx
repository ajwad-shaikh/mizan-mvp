import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mizan — AI Enablement Agency",
  description:
    "Audit developer–AI coding sessions and publish an actionable playbook to GitHub.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        <div className="mx-auto max-w-5xl px-6 py-8">{children}</div>
      </body>
    </html>
  );
}
