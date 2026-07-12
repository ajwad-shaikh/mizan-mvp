import Link from "next/link";
import { getStore } from "@/lib/store";
import { StatusBadge } from "@/components/agency/status-badge";

export const dynamic = "force-dynamic";

export default async function RunsPage() {
  const engagements = await getStore().listEngagements();

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Engagements</h1>
        <Link href="/" className="text-sm text-muted hover:text-white">
          + New engagement
        </Link>
      </div>

      {engagements.length === 0 ? (
        <p className="text-sm text-muted">
          No engagements yet. <Link href="/" className="text-accent">Create one</Link>.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {engagements.map((e) => (
            <li key={e.id} className="flex items-center justify-between px-4 py-3">
              <div className="min-w-0">
                <Link href={`/runs/${e.id}`} className="font-medium hover:text-accent">
                  {e.title}
                </Link>
                <p className="truncate text-xs text-muted">{e.repositoryUrl}</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted">
                {typeof e.estimatedCostUsd === "number" && <span>${e.estimatedCostUsd.toFixed(4)}</span>}
                {e.githubIssueUrl && (
                  <a href={e.githubIssueUrl} className="text-accent" target="_blank" rel="noreferrer">
                    issue
                  </a>
                )}
                <StatusBadge status={e.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
