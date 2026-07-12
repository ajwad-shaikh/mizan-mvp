import type { AgentSelection } from "@/lib/agents/types";
import type { StoredPlan } from "@/lib/store/types";

const AGENT_LABELS: Record<string, string> = {
  session_auditor: "Session Auditor",
  context_investigator: "Context Investigator",
  efficiency_analyst: "Efficiency Analyst",
  workflow_coach: "Workflow Coach",
  quality_reviewer: "Quality Reviewer",
};

function label(agent: string): string {
  return AGENT_LABELS[agent] ?? agent;
}

export function AgencyPlanView({ plan }: { plan: StoredPlan }) {
  const selected = plan.selectedAgents as AgentSelection[];
  const skipped = plan.skippedAgents as Array<{ agent: string; reason: string }>;

  return (
    <section className="space-y-4 rounded-lg border border-border bg-surface/40 p-5">
      <h2 className="text-lg font-medium">Agency plan</h2>
      <p className="text-sm text-muted">{plan.engagementSummary}</p>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-white/80">Selected specialists</h3>
        <ul className="space-y-2">
          {selected.map((a) => (
            <li key={a.agent} className="rounded-md border border-border p-3">
              <div className="flex items-center gap-2">
                <span className="rounded bg-green-500/15 px-2 py-0.5 text-xs text-green-300">Selected</span>
                <span className="text-sm font-medium">{label(a.agent)}</span>
              </div>
              <p className="mt-1 text-xs text-muted">{a.reason}</p>
            </li>
          ))}
        </ul>
      </div>

      {skipped.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-white/80">Skipped specialists</h3>
          <ul className="space-y-2">
            {skipped.map((a) => (
              <li key={a.agent} className="rounded-md border border-border p-3">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-white/10 px-2 py-0.5 text-xs text-white/60">Skipped</span>
                  <span className="text-sm font-medium">{label(a.agent)}</span>
                </div>
                <p className="mt-1 text-xs text-muted">{a.reason}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h3 className="mb-2 text-sm font-semibold text-white/80">Acceptance criteria</h3>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
          {plan.acceptanceCriteria.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
