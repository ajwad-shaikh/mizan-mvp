import type { AgentStep } from "@/lib/store/types";

const AGENT_LABELS: Record<string, string> = {
  agency_manager: "Agency Manager",
  session_auditor: "Session Auditor",
  workflow_coach: "Workflow Coach",
  quality_reviewer: "Quality Reviewer",
};

function label(step: AgentStep): string {
  const base = AGENT_LABELS[step.agentName] ?? step.agentName;
  return step.version > 1 ? `${base} v${step.version}` : base;
}

/** One expandable trace node. Shows concise metadata; full input/output on demand. */
export function TraceNode({ step }: { step: AgentStep }) {
  const failed = step.status === "failed";
  return (
    <details className="rounded-md border border-border">
      <summary className="flex cursor-pointer flex-wrap items-center gap-3 px-3 py-2 text-sm">
        <span
          className={`h-2 w-2 rounded-full ${failed ? "bg-red-400" : "bg-green-400"}`}
          aria-hidden
        />
        <span className="font-medium">{label(step)}</span>
        <span className="ml-auto flex items-center gap-3 text-xs text-muted">
          {typeof step.latencyMs === "number" && <span>{step.latencyMs}ms</span>}
          {typeof step.inputTokens === "number" && (
            <span>
              {step.inputTokens}/{step.outputTokens} tok
            </span>
          )}
          {typeof step.estimatedCostUsd === "number" && <span>${step.estimatedCostUsd.toFixed(6)}</span>}
          <span className={failed ? "text-red-300" : "text-green-300"}>{step.status}</span>
        </span>
      </summary>
      <div className="space-y-3 border-t border-border px-3 py-3 text-xs">
        {step.error && (
          <div className="rounded bg-red-500/10 p-2 text-red-300">
            <div className="font-semibold">Error</div>
            <div>{step.error}</div>
          </div>
        )}
        <div>
          <div className="mb-1 font-semibold text-white/70">Input</div>
          <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-black/30 p-2 text-muted">
            {JSON.stringify(step.input, null, 2)}
          </pre>
        </div>
        {step.output !== undefined && (
          <div>
            <div className="mb-1 font-semibold text-white/70">Output</div>
            <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-black/30 p-2 text-muted">
              {JSON.stringify(step.output, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </details>
  );
}
