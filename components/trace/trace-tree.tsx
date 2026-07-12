import type { AgentStep } from "@/lib/store/types";
import { TraceNode } from "./trace-node";

export function TraceTree({ steps }: { steps: AgentStep[] }) {
  const totalCost = steps.reduce((sum, s) => sum + (s.estimatedCostUsd ?? 0), 0);
  const totalLatency = steps.reduce((sum, s) => sum + (s.latencyMs ?? 0), 0);

  return (
    <section className="space-y-3 rounded-lg border border-border bg-surface/40 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Agent trace</h2>
        <span className="text-xs text-muted">
          {steps.length} steps · {totalLatency}ms · ${totalCost.toFixed(6)}
        </span>
      </div>
      {steps.length === 0 ? (
        <p className="text-sm text-muted">No agent steps recorded yet.</p>
      ) : (
        <div className="space-y-2">
          {steps.map((step) => (
            <TraceNode key={step.id} step={step} />
          ))}
        </div>
      )}
    </section>
  );
}
