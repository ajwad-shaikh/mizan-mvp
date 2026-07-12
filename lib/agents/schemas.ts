import { z } from "zod";

/**
 * Structured contracts for every model boundary in the first vertical slice.
 * Each schema is runtime-validated so no unstructured model output can flow
 * into persistence, orchestration, or GitHub publication.
 */

export const AGENT_NAMES = [
  "session_auditor",
  "context_investigator",
  "efficiency_analyst",
  "workflow_coach",
  "quality_reviewer",
] as const;

export const AgentNameSchema = z.enum(AGENT_NAMES);

const SeveritySchema = z.enum(["low", "medium", "high"]);

const nonEmpty = (label: string) => z.string().min(1, `${label} must not be empty`);

export const AgentSelectionSchema = z.object({
  agent: AgentNameSchema,
  reason: nonEmpty("reason"),
  instructions: z.array(nonEmpty("instruction")).default([]),
});

export const AgentSkipSchema = z.object({
  agent: AgentNameSchema,
  reason: nonEmpty("reason"),
});

export const AgencyPlanSchema = z.object({
  engagementSummary: nonEmpty("engagementSummary"),
  selectedAgents: z.array(AgentSelectionSchema).min(1, "at least one agent must be selected"),
  skippedAgents: z.array(AgentSkipSchema).default([]),
  acceptanceCriteria: z.array(nonEmpty("criterion")).min(1, "at least one acceptance criterion is required"),
  requiresExternalResearch: z.boolean(),
  requiresRepositoryEvidence: z.boolean(),
});

export const RequirementChangeSchema = z.object({
  turn: z.number().int().nonnegative(),
  change: nonEmpty("change"),
  impact: nonEmpty("impact"),
});

export const SessionProblemSchema = z.object({
  type: nonEmpty("type"),
  severity: SeveritySchema,
  evidence: nonEmpty("evidence"),
});

export const SessionAuditSchema = z.object({
  initialObjective: nonEmpty("initialObjective"),
  finalObjective: nonEmpty("finalObjective"),
  summary: nonEmpty("summary"),
  userTurns: z.number().int().nonnegative(),
  assistantTurns: z.number().int().nonnegative(),
  correctiveTurns: z.number().int().nonnegative(),
  requirementChanges: z.array(RequirementChangeSchema).default([]),
  strengths: z.array(nonEmpty("strength")).default([]),
  problems: z.array(SessionProblemSchema).default([]),
  verificationObserved: z.boolean(),
});

export const WorkflowStepSchema = z.object({
  step: z.number().int().positive(),
  action: nonEmpty("action"),
  reason: nonEmpty("reason"),
});

export const PlaybookSchema = z.object({
  name: nonEmpty("name"),
  content: nonEmpty("content"),
});

export const WorkflowRecommendationSchema = z.object({
  improvedPrompt: nonEmpty("improvedPrompt"),
  recommendedContextBundle: z.array(nonEmpty("context path")).default([]),
  recommendedWorkflow: z.array(WorkflowStepSchema).min(1, "at least one workflow step is required"),
  verificationPlan: z.array(nonEmpty("verification step")).min(1, "at least one verification step is required"),
  reusablePlaybook: PlaybookSchema,
  coachingNotes: z.array(nonEmpty("coaching note")).default([]),
});

export const ReviewIssueSchema = z.object({
  type: nonEmpty("type"),
  description: nonEmpty("description"),
  requiredAction: nonEmpty("requiredAction"),
});

export const QualityReviewSchema = z
  .object({
    status: z.enum(["approved", "revision_requested"]),
    score: z.number().min(0).max(100),
    issues: z.array(ReviewIssueSchema).default([]),
    revisionTarget: AgentNameSchema.optional(),
    revisionInstructions: z.array(nonEmpty("revision instruction")).default([]),
  })
  .refine(
    (r) => r.status !== "revision_requested" || r.revisionInstructions.length > 0,
    { message: "revision_requested requires at least one revision instruction", path: ["revisionInstructions"] },
  );

export const ReportFindingSchema = z.object({
  title: nonEmpty("title"),
  detail: nonEmpty("detail"),
  severity: SeveritySchema,
});

export const EfficiencyEstimateSchema = z.object({
  summary: nonEmpty("summary"),
  // Structurally forces every efficiency claim to be labelled an estimate.
  isEstimate: z.literal(true),
  basis: nonEmpty("basis"),
});

export const ExecutiveReportSchema = z.object({
  taskName: nonEmpty("taskName"),
  executiveSummary: nonEmpty("executiveSummary"),
  whatHappened: nonEmpty("whatHappened"),
  findings: z.array(ReportFindingSchema).default([]),
  improvedPrompt: nonEmpty("improvedPrompt"),
  recommendedContextBundle: z.array(nonEmpty("context path")).default([]),
  recommendedWorkflow: z.array(WorkflowStepSchema).default([]),
  verificationPlan: z.array(nonEmpty("verification step")).default([]),
  estimatedEfficiency: EfficiencyEstimateSchema.optional(),
  reusablePlaybook: PlaybookSchema,
  methodologyAndLimitations: nonEmpty("methodologyAndLimitations"),
});
