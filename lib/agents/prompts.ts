import type { SessionAudit, WorkflowRecommendation, Strictness, QualityReview } from "./types";
import type { AgencyPlan } from "./types";

/**
 * Small, focused prompts. Each agent receives only the handoff data it needs.
 * All prompts require JSON-only output so responses flow through Zod validation.
 */

const JSON_ONLY = "Respond with a single JSON object only. Do not include prose, markdown, or code fences.";

export const MANAGER_SYSTEM = [
  "You are the Agency Manager of an AI enablement consulting agency.",
  "You plan a task-specific audit of a developer's AI coding session.",
  "Select only the specialists that are genuinely needed and skip the rest with a reason.",
  "Define concrete acceptance criteria the final report must satisfy.",
  "Available specialists: session_auditor, workflow_coach, quality_reviewer. context_investigator and efficiency_analyst are not available in this slice and should be skipped with a reason.",
  JSON_ONLY,
].join(" ");

export type ManagerInput = {
  title: string;
  taskObjective: string;
  conversation: string;
  repositoryUrl: string;
  strictness: Strictness;
  hasTokenMetadata: boolean;
};

export function buildManagerPrompt(input: ManagerInput): string {
  return [
    `Engagement title: ${input.title}`,
    `Repository: ${input.repositoryUrl}`,
    `Strictness: ${input.strictness}`,
    `Token metadata supplied: ${input.hasTokenMetadata ? "yes" : "no"}`,
    "",
    "Task objective:",
    input.taskObjective,
    "",
    "AI coding conversation:",
    input.conversation,
    "",
    "Produce an AgencyPlan: engagementSummary, selectedAgents (agent, reason, instructions[]), skippedAgents (agent, reason), acceptanceCriteria[], requiresExternalResearch, requiresRepositoryEvidence.",
  ].join("\n");
}

export const SESSION_AUDITOR_SYSTEM = [
  "You are the Session Auditor.",
  "You reconstruct only what happened in the supplied conversation.",
  "Do not speculate about repository contents you were not given.",
  JSON_ONLY,
].join(" ");

export type SessionAuditorInput = {
  taskObjective: string;
  conversation: string;
  instructions?: string[];
};

export function buildSessionAuditorPrompt(input: SessionAuditorInput): string {
  const instructions = input.instructions?.length
    ? `\nManager instructions:\n- ${input.instructions.join("\n- ")}\n`
    : "";
  return [
    "Task objective:",
    input.taskObjective,
    instructions,
    "Conversation to diagnose:",
    input.conversation,
    "",
    "Return exactly this JSON shape (replace example values, preserve types and nested keys):",
    '{"initialObjective":"string","finalObjective":"string","summary":"string","userTurns":0,"assistantTurns":0,"correctiveTurns":0,"requirementChanges":[{"turn":0,"change":"string","impact":"string"}],"strengths":["string"],"problems":[{"type":"string","severity":"low|medium|high","evidence":"string"}],"verificationObserved":true}',
    "verificationObserved must be a boolean, not an object. problems must contain objects with type, severity, and evidence; use [] when there are no problems.",
  ].join("\n");
}

export const WORKFLOW_COACH_SYSTEM = [
  "You are the Workflow Coach.",
  "You turn the audit findings into a better, directly reusable operating workflow.",
  "The improved prompt must be complete enough to reuse without editing.",
  JSON_ONLY,
].join(" ");

export type WorkflowCoachInput = {
  taskObjective: string;
  audit: SessionAudit;
  instructions?: string[];
  revisionInstructions?: string[];
  previous?: WorkflowRecommendation;
};

export function buildWorkflowCoachPrompt(input: WorkflowCoachInput): string {
  const parts: string[] = [
    "Task objective:",
    input.taskObjective,
    "",
    "Session audit findings:",
    JSON.stringify(input.audit, null, 2),
  ];
  if (input.instructions?.length) {
    parts.push("", "Manager instructions:", `- ${input.instructions.join("\n- ")}`);
  }
  if (input.revisionInstructions?.length) {
    parts.push(
      "",
      "The Quality Reviewer requested a revision. Apply these instructions:",
      `- ${input.revisionInstructions.join("\n- ")}`,
    );
    if (input.previous) {
      parts.push("", "Your previous recommendation to revise:", JSON.stringify(input.previous, null, 2));
    }
  }
  parts.push(
    "",
    "Return exactly this JSON shape (replace example values, preserve types and nested keys):",
    '{"improvedPrompt":"string","recommendedContextBundle":["path"],"recommendedWorkflow":[{"step":1,"action":"string","reason":"string"}],"verificationPlan":["string"],"reusablePlaybook":{"name":"string","content":"string"},"coachingNotes":["string"]}',
  );
  return parts.join("\n");
}

export const QUALITY_REVIEWER_SYSTEM = [
  "You are the Quality Reviewer.",
  "You block unsupported or low-quality recommendations from reaching the client.",
  "Check that the improved prompt is actionable and reusable, that estimates are labelled, and that the manager's acceptance criteria are satisfied.",
  "Approve only when the work is genuinely client-ready. Otherwise request exactly one revision with concrete instructions.",
  JSON_ONLY,
].join(" ");

export type QualityReviewerInput = {
  acceptanceCriteria: string[];
  strictness: Strictness;
  audit: SessionAudit;
  recommendation: WorkflowRecommendation;
  previousReview?: QualityReview;
};

export function buildQualityReviewerPrompt(input: QualityReviewerInput): string {
  const parts = [
    `Strictness: ${input.strictness}`,
    "",
    "Acceptance criteria to enforce:",
    `- ${input.acceptanceCriteria.join("\n- ")}`,
    "",
    "Session audit:",
    JSON.stringify(input.audit, null, 2),
    "",
    "Workflow recommendation under review:",
    JSON.stringify(input.recommendation, null, 2),
  ];
  if (input.previousReview) {
    parts.push(
      "",
      "Previous reviewer decision and required changes:",
      JSON.stringify(input.previousReview, null, 2),
      "This is a revision review. Check whether each previous required action is now satisfied. Approve when it is. Be evidence-based and do not claim required information is missing when it is present in the recommendation.",
    );
  }
  parts.push(
    "",
    "Return exactly this JSON shape (preserve types and nested keys):",
    '{"status":"approved","score":90,"issues":[],"revisionInstructions":[]}',
    'If revision is genuinely required, return this complete shape: {"status":"revision_requested","score":55,"issues":[{"type":"missing_constraint","description":"specific evidence-based issue","requiredAction":"specific correction"}],"revisionTarget":"workflow_coach","revisionInstructions":["specific correction"]}.',
  );
  return parts.join("\n");
}

export type { AgencyPlan };
