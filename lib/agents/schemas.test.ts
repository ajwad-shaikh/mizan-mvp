import { describe, it, expect } from "vitest";
import {
  AgencyPlanSchema,
  SessionAuditSchema,
  WorkflowRecommendationSchema,
  QualityReviewSchema,
  ExecutiveReportSchema,
} from "./schemas";

const validPlan = {
  engagementSummary: "Audit a retry implementation session.",
  selectedAgents: [
    {
      agent: "session_auditor",
      reason: "Reconstruct the conversation.",
      instructions: ["Count corrective turns."],
    },
  ],
  skippedAgents: [
    { agent: "efficiency_analyst", reason: "No token metadata supplied." },
  ],
  acceptanceCriteria: ["The improved prompt must be reusable."],
  requiresExternalResearch: false,
  requiresRepositoryEvidence: true,
};

const validAudit = {
  initialObjective: "Add retries.",
  finalObjective: "Add retries only for transient errors.",
  summary: "The task drifted as constraints arrived late.",
  userTurns: 6,
  assistantTurns: 6,
  correctiveTurns: 3,
  requirementChanges: [
    { turn: 3, change: "Only transient errors", impact: "Rework of loop." },
  ],
  strengths: ["Eventually verified with tests."],
  problems: [
    { type: "missing_constraint", severity: "high", evidence: "No error scope in turn 1." },
  ],
  verificationObserved: true,
};

const validWorkflow = {
  improvedPrompt: "Objective\n\nAdd retries for transient errors only.",
  recommendedWorkflow: [
    { step: 1, action: "Inspect the retry abstraction first.", reason: "Avoid wrong assumptions." },
  ],
  verificationPlan: ["Run existing unit tests."],
  reusablePlaybook: { name: "Retry Behaviour Change", content: "Steps..." },
  coachingNotes: ["State invariants before implementation."],
};

const validReviewApproved = {
  status: "approved",
  score: 88,
  issues: [],
  revisionInstructions: [],
};

const validReviewRevision = {
  status: "revision_requested",
  score: 55,
  issues: [
    {
      type: "unsupported_repository_claim",
      description: "RetryPolicy cited without evidence.",
      requiredAction: "Add a repository citation.",
    },
  ],
  revisionInstructions: ["Cite internal/retry/policy.go for the RetryPolicy claim."],
};

const validReport = {
  taskName: "Add transient-error retries",
  executiveSummary: "The session succeeded but took avoidable iterations.",
  whatHappened: "Constraints arrived after implementation began.",
  findings: [
    { title: "Late acceptance criteria", detail: "Scope arrived in turn 3.", severity: "high" },
  ],
  improvedPrompt: "Objective\n\nAdd retries for transient errors only.",
  recommendedContextBundle: ["internal/retry/policy.go"],
  recommendedWorkflow: [
    { step: 1, action: "Inspect the retry abstraction first.", reason: "Avoid wrong assumptions." },
  ],
  verificationPlan: ["Run existing unit tests."],
  reusablePlaybook: { name: "Retry Behaviour Change", content: "Steps..." },
  methodologyAndLimitations: "Findings are based only on the supplied conversation.",
};

describe("AgencyPlanSchema", () => {
  it("accepts a valid plan", () => {
    expect(AgencyPlanSchema.parse(validPlan)).toMatchObject({ requiresRepositoryEvidence: true });
  });
  it("rejects an unknown agent name", () => {
    const bad = { ...validPlan, selectedAgents: [{ agent: "wizard", reason: "x", instructions: [] }] };
    expect(AgencyPlanSchema.safeParse(bad).success).toBe(false);
  });
  it("rejects an empty acceptanceCriteria list", () => {
    expect(AgencyPlanSchema.safeParse({ ...validPlan, acceptanceCriteria: [] }).success).toBe(false);
  });
});

describe("SessionAuditSchema", () => {
  it("accepts a valid audit", () => {
    expect(SessionAuditSchema.parse(validAudit).correctiveTurns).toBe(3);
  });
  it("rejects a negative turn count", () => {
    expect(SessionAuditSchema.safeParse({ ...validAudit, userTurns: -1 }).success).toBe(false);
  });
  it("rejects an invalid problem severity", () => {
    const bad = { ...validAudit, problems: [{ type: "x", severity: "critical", evidence: "y" }] };
    expect(SessionAuditSchema.safeParse(bad).success).toBe(false);
  });
});

describe("WorkflowRecommendationSchema", () => {
  it("accepts a valid recommendation", () => {
    expect(WorkflowRecommendationSchema.parse(validWorkflow).reusablePlaybook.name).toBe(
      "Retry Behaviour Change",
    );
  });
  it("rejects an empty improved prompt", () => {
    expect(WorkflowRecommendationSchema.safeParse({ ...validWorkflow, improvedPrompt: "" }).success).toBe(
      false,
    );
  });
});

describe("QualityReviewSchema", () => {
  it("accepts an approved review", () => {
    expect(QualityReviewSchema.parse(validReviewApproved).status).toBe("approved");
  });
  it("accepts a revision request with instructions", () => {
    expect(QualityReviewSchema.parse(validReviewRevision).status).toBe("revision_requested");
  });
  it("rejects a revision request with no instructions", () => {
    const bad = { ...validReviewRevision, revisionInstructions: [] };
    expect(QualityReviewSchema.safeParse(bad).success).toBe(false);
  });
  it("rejects an out-of-range score", () => {
    expect(QualityReviewSchema.safeParse({ ...validReviewApproved, score: 150 }).success).toBe(false);
  });
});

describe("ExecutiveReportSchema", () => {
  it("accepts a valid report", () => {
    expect(ExecutiveReportSchema.parse(validReport).taskName).toBe("Add transient-error retries");
  });
  it("rejects an efficiency estimate not marked as an estimate", () => {
    const bad = {
      ...validReport,
      estimatedEfficiency: { summary: "Save 40%", isEstimate: false, basis: "guess" },
    };
    expect(ExecutiveReportSchema.safeParse(bad).success).toBe(false);
  });
  it("accepts an efficiency estimate marked as an estimate", () => {
    const ok = {
      ...validReport,
      estimatedEfficiency: {
        summary: "Roughly 2-3 avoidable turns.",
        isEstimate: true,
        basis: "Corrective turn count.",
      },
    };
    expect(ExecutiveReportSchema.safeParse(ok).success).toBe(true);
  });
});
