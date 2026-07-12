import type { ModelAdapter } from "@/lib/ai/client";
import { StructuredOutputError, type StructuredResult } from "@/lib/ai/structured-output";
import { runManager } from "./manager";
import { runSessionAuditor } from "./session-auditor";
import { runWorkflowCoach } from "./workflow-coach";
import { runQualityReviewer } from "./quality-reviewer";
import { composeExecutiveReport } from "@/lib/reports/compose-report";
import type {
  AgencyPlan,
  ExecutiveReport,
  QualityReview,
  SessionAudit,
  Strictness,
  WorkflowRecommendation,
} from "./types";

/** A single recorded agent step for the trace. */
export type AgentStepRecord = {
  agentName: string;
  version: number;
  status: "completed" | "failed";
  input: unknown;
  output?: unknown;
  inputTokens?: number;
  outputTokens?: number;
  estimatedCostUsd?: number;
  latencyMs?: number;
  error?: string;
  rawResponses?: string[];
};

export interface TraceRecorder {
  record(step: AgentStepRecord): void | Promise<void>;
}

export type OrchestratorEngagement = {
  title: string;
  taskObjective: string;
  conversation: string;
  repositoryUrl: string;
  strictness: Strictness;
  hasTokenMetadata: boolean;
};

export type OrchestrationOutcome = "awaiting_approval" | "review_failed";

export type OrchestrationResult = {
  outcome: OrchestrationOutcome;
  plan: AgencyPlan;
  audit: SessionAudit | null;
  recommendation: WorkflowRecommendation;
  reviews: QualityReview[];
  report: ExecutiveReport | null;
  revisions: number;
};

export type RunOrchestrationArgs = {
  adapter: ModelAdapter;
  engagement: OrchestratorEngagement;
  recorder?: TraceRecorder;
};

const noopRecorder: TraceRecorder = { record() {} };

/** Maximum reviewer revision cycles for the MVP. */
const MAX_REVISIONS = 1;

async function record<T>(
  recorder: TraceRecorder,
  agentName: string,
  version: number,
  input: unknown,
  run: () => Promise<StructuredResult<T>>,
): Promise<StructuredResult<T>> {
  try {
    const result = await run();
    await recorder.record({
      agentName,
      version,
      status: "completed",
      input,
      output: result.data,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      estimatedCostUsd: result.estimatedCostUsd,
      latencyMs: result.latencyMs,
      rawResponses: result.rawResponses,
    });
    return result;
  } catch (err) {
    const failed: AgentStepRecord = {
      agentName,
      version,
      status: "failed",
      input,
      error: err instanceof Error ? err.message : String(err),
      rawResponses: err instanceof StructuredOutputError ? err.rawResponses : undefined,
    };
    await recorder.record(failed);
    throw err;
  }
}

/**
 * Run the core agents sequentially, honouring the manager's dynamic selection,
 * persisting every handoff, and supporting exactly one reviewer revision routed
 * back to the Workflow Coach. A draft report is composed only after reviewer
 * approval; a second rejection stops before publication.
 */
export async function runAgencyOrchestration(args: RunOrchestrationArgs): Promise<OrchestrationResult> {
  const { adapter, engagement } = args;
  const recorder = args.recorder ?? noopRecorder;

  // 1. Agency Manager plans the engagement.
  const managerResult = await record(recorder, "agency_manager", 1, engagement, () =>
    runManager(adapter, {
      title: engagement.title,
      taskObjective: engagement.taskObjective,
      conversation: engagement.conversation,
      repositoryUrl: engagement.repositoryUrl,
      strictness: engagement.strictness,
      hasTokenMetadata: engagement.hasTokenMetadata,
    }),
  );
  const plan = managerResult.data;
  const selected = new Set(plan.selectedAgents.map((a) => a.agent));
  const supported = new Set(["session_auditor", "workflow_coach", "quality_reviewer"]);
  const unsupported = [...selected].filter((agent) => !supported.has(agent));
  if (unsupported.length > 0) {
    throw new Error(`The Agency Manager selected unsupported agents for this MVP: ${unsupported.join(", ")}.`);
  }
  if (!selected.has("quality_reviewer")) {
    throw new Error("The Quality Reviewer is mandatory for every publishable report.");
  }

  // 2. Session Auditor (if selected).
  let audit: SessionAudit | null = null;
  if (selected.has("session_auditor")) {
    const auditorInstructions = plan.selectedAgents.find((a) => a.agent === "session_auditor")?.instructions;
    const auditResult = await record(
      recorder,
      "session_auditor",
      1,
      { taskObjective: engagement.taskObjective, conversation: engagement.conversation },
      () =>
        runSessionAuditor(adapter, {
          taskObjective: engagement.taskObjective,
          conversation: engagement.conversation,
          instructions: auditorInstructions,
        }),
    );
    audit = auditResult.data;
  }

  const coachSelected = selected.has("workflow_coach");
  const coachInstructions = plan.selectedAgents.find((a) => a.agent === "workflow_coach")?.instructions;

  // 3. Workflow Coach v1, or a deterministic short health recommendation when skipped.
  let coachVersion = 1;
  let recommendation: WorkflowRecommendation;
  if (coachSelected) {
    recommendation = (
      await record(recorder, "workflow_coach", coachVersion, { taskObjective: engagement.taskObjective, audit }, () =>
        runWorkflowCoach(adapter, {
          taskObjective: engagement.taskObjective,
          audit: audit ?? synthesizeAudit(engagement),
          instructions: coachInstructions,
        }),
      )
    ).data;
  } else {
    recommendation = healthyRecommendation(engagement);
  }

  // 4. Quality Reviewer, with up to one supported revision routed to the coach.
  const reviews: QualityReview[] = [];
  let revisions = 0;
  let reviewerVersion = 0;

  while (true) {
    reviewerVersion += 1;
    const reviewResult = await record(
      recorder,
      "quality_reviewer",
      reviewerVersion,
      { acceptanceCriteria: plan.acceptanceCriteria, recommendation },
      () =>
        runQualityReviewer(adapter, {
          acceptanceCriteria: plan.acceptanceCriteria,
          strictness: engagement.strictness,
          audit: audit ?? synthesizeAudit(engagement),
          recommendation,
        }),
    );
    reviews.push(reviewResult.data);

    if (reviewResult.data.status === "approved") {
      const report = composeExecutiveReport({
        taskName: engagement.title,
        audit,
        recommendation,
      });
      return { outcome: "awaiting_approval", plan, audit, recommendation, reviews, report, revisions };
    }

    // revision_requested: only the selected Workflow Coach is revisable in this MVP.
    const revisionTarget = reviewResult.data.revisionTarget ?? "workflow_coach";
    if (revisionTarget !== "workflow_coach" || !coachSelected) {
      return { outcome: "review_failed", plan, audit, recommendation, reviews, report: null, revisions };
    }
    if (revisions >= MAX_REVISIONS) {
      return { outcome: "review_failed", plan, audit, recommendation, reviews, report: null, revisions };
    }

    revisions += 1;
    coachVersion += 1;
    recommendation = (
      await record(
        recorder,
        "workflow_coach",
        coachVersion,
        { revisionInstructions: reviewResult.data.revisionInstructions },
        () =>
          runWorkflowCoach(adapter, {
            taskObjective: engagement.taskObjective,
            audit: audit ?? synthesizeAudit(engagement),
            instructions: coachInstructions,
            revisionInstructions: reviewResult.data.revisionInstructions,
            previous: recommendation,
          }),
      )
    ).data;
  }
}

/** Minimal deterministic recommendation for a healthy session where coaching was skipped. */
function healthyRecommendation(engagement: OrchestratorEngagement): WorkflowRecommendation {
  return {
    improvedPrompt: `Objective\n${engagement.taskObjective}\n\nVerification steps\n- Preserve the clear constraints and verification used in this session.`,
    recommendedContextBundle: [],
    recommendedWorkflow: [
      {
        step: 1,
        action: "Continue using the clear objective, constraints, and verification demonstrated in this session.",
        reason: "The manager found no coaching intervention necessary.",
      },
    ],
    verificationPlan: ["Repeat the verification steps already used for comparable tasks."],
    reusablePlaybook: {
      name: "Healthy AI coding session",
      content: "State the objective and constraints clearly, then verify the result before completion.",
    },
    coachingNotes: [],
  };
}

/** A minimal audit stand-in when the manager skips the Session Auditor. */
function synthesizeAudit(engagement: OrchestratorEngagement): SessionAudit {
  return {
    initialObjective: engagement.taskObjective,
    finalObjective: engagement.taskObjective,
    summary: "No session audit was performed; the workflow coach worked from the objective only.",
    userTurns: 0,
    assistantTurns: 0,
    correctiveTurns: 0,
    requirementChanges: [],
    strengths: [],
    problems: [],
    verificationObserved: false,
  };
}
