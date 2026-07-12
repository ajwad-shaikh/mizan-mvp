import Link from "next/link";
import { notFound } from "next/navigation";
import { getStore } from "@/lib/store";
import type { ExecutiveReport } from "@/lib/agents/types";
import { StatusBadge } from "@/components/agency/status-badge";
import { AgencyPlanView } from "@/components/agency/agency-plan";
import { ReviewerDecision } from "@/components/agency/reviewer-decision";
import { TraceTree } from "@/components/trace/trace-tree";
import { ExecutiveSummary } from "@/components/report/executive-summary";
import { PublicationPreview } from "@/components/publication/publication-preview";
import { ApprovePublication } from "@/components/publication/approve-publication";
import { GitHubIssueLink } from "@/components/publication/github-issue-link";

export const dynamic = "force-dynamic";

function parseReport(content: string | undefined): ExecutiveReport | null {
  if (!content) return null;
  try {
    return JSON.parse(content) as ExecutiveReport;
  } catch {
    return null;
  }
}

export default async function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = getStore();
  const engagement = await store.getEngagement(id);
  if (!engagement) notFound();

  const [plan, steps, artifacts] = await Promise.all([
    store.getPlan(id),
    store.listAgentSteps(id),
    store.listArtifacts(id),
  ]);

  const reportArtifact = artifacts.find((a) => a.type === "executive_report");
  const report = parseReport(reportArtifact?.content);
  const reviewerSteps = steps.filter((s) => s.agentName === "quality_reviewer");

  return (
    <main className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/runs" className="text-xs text-muted hover:text-white">
            ← All engagements
          </Link>
          <h1 className="mt-1 text-xl font-semibold">{engagement.title}</h1>
          <p className="text-sm text-muted">{engagement.repositoryUrl}</p>
        </div>
        <StatusBadge status={engagement.status} />
      </div>

      <section className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-surface/40 p-4 text-sm sm:grid-cols-4">
        <Metric label="Cost (est.)" value={money(engagement.estimatedCostUsd)} />
        <Metric label="Latency" value={engagement.totalLatencyMs ? `${engagement.totalLatencyMs}ms` : "—"} />
        <Metric
          label="Tokens"
          value={
            engagement.totalInputTokens != null
              ? `${engagement.totalInputTokens}/${engagement.totalOutputTokens}`
              : "—"
          }
        />
        <Metric label="Revisions" value={engagement.revisionCount != null ? String(engagement.revisionCount) : "—"} />
      </section>

      {engagement.budgetExceeded && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          Estimated cost exceeds the maximum budget of ${engagement.maxBudgetUsd.toFixed(2)}.
        </div>
      )}

      {engagement.status === "failed" && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          This engagement failed: {engagement.error ?? "unknown error"}. Completed agent steps are
          preserved in the trace below.
        </div>
      )}

      {engagement.status === "review_failed" && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          The Quality Reviewer requested changes again after one revision, so publication was blocked.
        </div>
      )}

      {plan && <AgencyPlanView plan={plan} />}

      {reviewerSteps.length > 0 && <ReviewerDecision reviewerSteps={reviewerSteps} />}

      {report && <ExecutiveSummary report={report} />}

      {report && engagement.status !== "completed" && <PublicationPreview report={report} />}

      {engagement.githubIssueUrl ? (
        <GitHubIssueLink url={engagement.githubIssueUrl} number={engagement.githubIssueNumber} />
      ) : (
        engagement.status === "awaiting_approval" &&
        engagement.reviewOutcome === "approved" && <ApprovePublication engagementId={engagement.id} />
      )}

      {engagement.error && engagement.status === "awaiting_approval" && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {engagement.error}
        </div>
      )}

      <TraceTree steps={steps} />
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-0.5 font-medium">{value}</div>
    </div>
  );
}

function money(value: number | undefined): string {
  return typeof value === "number" ? `$${value.toFixed(6)}` : "—";
}
