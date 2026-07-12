import { ExecutiveReportSchema } from "@/lib/agents/schemas";
import type { ExecutiveReport, SessionAudit, WorkflowRecommendation } from "@/lib/agents/types";

export type ComposeReportInput = {
  taskName: string;
  audit: SessionAudit | null;
  recommendation: WorkflowRecommendation;
};

/**
 * Deterministically compose the client-facing executive report from validated
 * agent outputs. This performs no model call; it only assembles and re-validates
 * data that already passed each agent's schema.
 */
export function composeExecutiveReport(input: ComposeReportInput): ExecutiveReport {
  const { audit, recommendation } = input;

  const findings = (audit?.problems ?? []).map((p) => ({
    title: p.type.replace(/_/g, " "),
    detail: p.evidence,
    severity: p.severity,
  }));

  const whatHappened = audit
    ? audit.summary
    : "No session audit was performed for this engagement.";

  const report: ExecutiveReport = {
    taskName: input.taskName,
    executiveSummary: audit
      ? `The session moved from "${audit.initialObjective}" to "${audit.finalObjective}" over ${audit.correctiveTurns} corrective turn(s). The recommended workflow reduces avoidable iteration.`
      : "This engagement produced an improved workflow recommendation for the task.",
    whatHappened,
    findings:
      findings.length > 0
        ? findings
        : [
            {
              title: "no major issues detected",
              detail: "The interaction did not surface high-severity problems.",
              severity: "low" as const,
            },
          ],
    improvedPrompt: recommendation.improvedPrompt,
    recommendedContextBundle: recommendation.recommendedContextBundle,
    recommendedWorkflow: recommendation.recommendedWorkflow,
    verificationPlan: recommendation.verificationPlan,
    reusablePlaybook: recommendation.reusablePlaybook,
    methodologyAndLimitations:
      "This audit is based only on the supplied conversation and task objective. Repository evidence and external research were out of scope for this engagement. Any efficiency figures are estimates, not measured savings.",
  };

  // Re-validate so a malformed composition can never reach publication.
  return ExecutiveReportSchema.parse(report);
}
