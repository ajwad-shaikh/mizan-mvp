import Link from "next/link";
import { EngagementForm } from "@/components/engagement/engagement-form";

export default function HomePage() {
  return (
    <main className="space-y-8">
      <header className="space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Mizan</h1>
          <Link href="/runs" className="text-sm text-muted hover:text-white">
            View engagements →
          </Link>
        </div>
        <p className="max-w-2xl text-sm text-muted">
          An AI enablement agency that audits developer–AI coding sessions, improves how the task
          should have been delegated, and publishes an actionable playbook as a real GitHub issue.
        </p>
      </header>

      <section className="rounded-lg border border-border bg-surface/40 p-6">
        <h2 className="mb-4 text-lg font-medium">New engagement</h2>
        <EngagementForm />
      </section>
    </main>
  );
}
