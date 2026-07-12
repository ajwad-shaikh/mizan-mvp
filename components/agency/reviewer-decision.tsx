import type { AgentStep } from "@/lib/store/types";
import type { QualityReview } from "@/lib/agents/types";

/** Show the final reviewer decision and any revision that was requested. */
export function ReviewerDecision({ reviewerSteps }: { reviewerSteps: AgentStep[] }) {
  if (reviewerSteps.length === 0) return null;

  const decisions = reviewerSteps
    .map((s) => s.output as QualityReview | undefined)
    .filter((r): r is QualityReview => Boolean(r));
  const final = decisions[decisions.length - 1];
  if (!final) return null;

  const approved = final.status === "approved";
  const requestedRevision = decisions.some((d) => d.status === "revision_requested");

  return (
    <section className="space-y-3 rounded-lg border border-border bg-surface/40 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Quality review</h2>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            approved ? "bg-green-500/15 text-green-300" : "bg-red-500/15 text-red-300"
          }`}
        >
          {approved ? `Approved · ${final.score}/100` : `Revision requested · ${final.score}/100`}
        </span>
      </div>

      {requestedRevision && (
        <p className="text-sm text-muted">
          The reviewer requested one revision, which was routed back to the Workflow Coach before the
          final decision.
        </p>
      )}

      {final.issues.length > 0 && (
        <ul className="space-y-2">
          {final.issues.map((issue, i) => (
            <li key={i} className="rounded-md border border-border p-3 text-sm">
              <div className="font-medium">{issue.type.replace(/_/g, " ")}</div>
              <p className="text-muted">{issue.description}</p>
              <p className="mt-1 text-xs text-white/60">Required action: {issue.requiredAction}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
