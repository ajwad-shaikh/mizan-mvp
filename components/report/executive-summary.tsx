import type { ExecutiveReport } from "@/lib/agents/types";
import { ImprovedPrompt } from "./improved-prompt";

const SEVERITY_COLORS: Record<string, string> = {
  high: "text-red-300",
  medium: "text-amber-300",
  low: "text-green-300",
};

export function ExecutiveSummary({ report }: { report: ExecutiveReport }) {
  return (
    <section className="space-y-5 rounded-lg border border-border bg-surface/40 p-5">
      <div>
        <h2 className="text-lg font-medium">Draft report</h2>
        <p className="mt-1 text-sm text-muted">{report.executiveSummary}</p>
      </div>

      <div>
        <h3 className="mb-1 text-sm font-semibold text-white/80">What happened</h3>
        <p className="text-sm text-muted">{report.whatHappened}</p>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-white/80">Primary findings</h3>
        <ul className="space-y-1 text-sm">
          {report.findings.map((f, i) => (
            <li key={i}>
              <span className={`font-medium ${SEVERITY_COLORS[f.severity] ?? ""}`}>{f.title}</span>{" "}
              <span className="text-muted">— {f.detail}</span>
            </li>
          ))}
        </ul>
      </div>

      <ImprovedPrompt prompt={report.improvedPrompt} />

      {report.recommendedContextBundle.length > 0 && (
        <div>
          <h3 className="mb-1 text-sm font-semibold text-white/80">Recommended context bundle</h3>
          <ul className="list-disc space-y-0.5 pl-5 text-sm text-muted">
            {report.recommendedContextBundle.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      {report.recommendedWorkflow.length > 0 && (
        <div>
          <h3 className="mb-1 text-sm font-semibold text-white/80">Recommended workflow</h3>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted">
            {report.recommendedWorkflow.map((s) => (
              <li key={s.step}>
                <span className="text-white/80">{s.action}</span> — {s.reason}
              </li>
            ))}
          </ol>
        </div>
      )}

      {report.verificationPlan.length > 0 && (
        <div>
          <h3 className="mb-1 text-sm font-semibold text-white/80">Verification plan</h3>
          <ul className="list-disc space-y-0.5 pl-5 text-sm text-muted">
            {report.verificationPlan.map((v, i) => (
              <li key={i}>{v}</li>
            ))}
          </ul>
        </div>
      )}

      {report.estimatedEfficiency && (
        <div className="rounded-md border border-border bg-black/20 p-3 text-sm">
          <span className="mr-2 rounded bg-amber-500/15 px-2 py-0.5 text-xs text-amber-300">Estimate</span>
          {report.estimatedEfficiency.summary}
          <p className="mt-1 text-xs text-muted">Basis: {report.estimatedEfficiency.basis}</p>
        </div>
      )}

      <div>
        <h3 className="mb-1 text-sm font-semibold text-white/80">Reusable playbook — {report.reusablePlaybook.name}</h3>
        <p className="text-sm text-muted">{report.reusablePlaybook.content}</p>
      </div>

      <p className="border-t border-border pt-3 text-xs text-muted">{report.methodologyAndLimitations}</p>
    </section>
  );
}
