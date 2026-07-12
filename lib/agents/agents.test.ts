import { describe, it, expect } from "vitest";
import { createFixtureAdapter } from "@/lib/ai/client";
import type { ModelAdapter, ModelRequest, RawModelResponse } from "@/lib/ai/client";
import { runManager } from "./manager";
import { runSessionAuditor } from "./session-auditor";
import { runWorkflowCoach } from "./workflow-coach";
import { runQualityReviewer } from "./quality-reviewer";
import type { SessionAudit, WorkflowRecommendation } from "./types";

/** Wrap an adapter to capture the prompts sent to the model. */
function capture(inner: ModelAdapter): { adapter: ModelAdapter; requests: ModelRequest[] } {
  const requests: ModelRequest[] = [];
  return {
    requests,
    adapter: {
      mode: inner.mode,
      async complete(request: ModelRequest): Promise<RawModelResponse> {
        requests.push(request);
        return inner.complete(request);
      },
    },
  };
}

const managerInput = {
  title: "Retry implementation audit",
  taskObjective: "Add retries for transient errors only.",
  conversation: "User: add retries\nAssistant: done\nUser: only transient ones",
  repositoryUrl: "https://github.com/acme/retry-service",
  strictness: "medium" as const,
  hasTokenMetadata: false,
};

const audit: SessionAudit = {
  initialObjective: "Add retries.",
  finalObjective: "Add retries for transient errors only.",
  summary: "Constraints arrived late.",
  userTurns: 6,
  assistantTurns: 6,
  correctiveTurns: 3,
  requirementChanges: [],
  strengths: [],
  problems: [{ type: "missing_constraint", severity: "high", evidence: "turn 1" }],
  verificationObserved: true,
};

describe("runManager", () => {
  it("produces a dynamic plan that selects and skips agents with acceptance criteria", async () => {
    const result = await runManager(createFixtureAdapter(), managerInput);
    const selected = result.data.selectedAgents.map((a) => a.agent);
    expect(selected).toContain("session_auditor");
    expect(selected).toContain("workflow_coach");
    expect(result.data.skippedAgents.map((a) => a.agent)).toContain("efficiency_analyst");
    expect(result.data.acceptanceCriteria.length).toBeGreaterThan(0);
  });

  it("injects the task objective and conversation into the prompt", async () => {
    const { adapter, requests } = capture(createFixtureAdapter());
    await runManager(adapter, managerInput);
    expect(requests[0].agentName).toBe("agency_manager");
    expect(requests[0].prompt).toContain(managerInput.taskObjective);
    expect(requests[0].prompt).toContain("only transient ones");
  });
});

describe("runSessionAuditor", () => {
  it("returns a validated audit of the conversation", async () => {
    const result = await runSessionAuditor(createFixtureAdapter(), {
      taskObjective: managerInput.taskObjective,
      conversation: managerInput.conversation,
    });
    expect(result.data.correctiveTurns).toBeGreaterThanOrEqual(0);
    expect(result.data.verificationObserved).toBe(true);
  });

  it("only sends the supplied conversation, not repository contents", async () => {
    const { adapter, requests } = capture(createFixtureAdapter());
    await runSessionAuditor(adapter, {
      taskObjective: managerInput.taskObjective,
      conversation: managerInput.conversation,
    });
    expect(requests[0].prompt).toContain(managerInput.conversation);
    expect(requests[0].prompt).toContain('"problems":[{"type":');
    expect(requests[0].prompt).toContain('"verificationObserved":true');
    expect(requests[0].prompt.toLowerCase()).not.toContain("repository file contents");
  });
});

describe("runWorkflowCoach", () => {
  it("produces a reusable improved prompt and a verification plan", async () => {
    const result = await runWorkflowCoach(createFixtureAdapter(), {
      taskObjective: managerInput.taskObjective,
      audit,
    });
    expect(result.data.improvedPrompt.length).toBeGreaterThan(0);
    expect(result.data.verificationPlan.length).toBeGreaterThan(0);
    expect(result.data.reusablePlaybook.name.length).toBeGreaterThan(0);
  });

  it("includes reviewer revision instructions in the prompt when revising", async () => {
    const { adapter, requests } = capture(createFixtureAdapter());
    await runWorkflowCoach(adapter, {
      taskObjective: managerInput.taskObjective,
      audit,
      revisionInstructions: ["Add the capped backoff constraint."],
    });
    expect(requests[0].prompt).toContain("Add the capped backoff constraint.");
  });
});

describe("runQualityReviewer", () => {
  const recommendation: WorkflowRecommendation = {
    improvedPrompt: "Objective\nAdd retries.",
    recommendedContextBundle: [],
    recommendedWorkflow: [{ step: 1, action: "Inspect.", reason: "Safety." }],
    verificationPlan: ["Run tests."],
    reusablePlaybook: { name: "Retry", content: "..." },
    coachingNotes: [],
  };

  it("includes the previous review when checking a revision", async () => {
    const { adapter, requests } = capture(createFixtureAdapter());
    await runQualityReviewer(adapter, {
      acceptanceCriteria: ["The improved prompt must be reusable."],
      strictness: "medium",
      audit,
      recommendation,
      previousReview: {
        status: "revision_requested",
        score: 55,
        issues: [{ type: "missing_constraint", description: "Backoff values missing.", requiredAction: "Add concrete backoff values." }],
        revisionTarget: "workflow_coach",
        revisionInstructions: ["Add concrete backoff values."],
      },
    });
    expect(requests[0].prompt).toContain("Previous reviewer decision");
    expect(requests[0].prompt).toContain("Add concrete backoff values.");
    expect(requests[0].prompt).toContain("do not claim required information is missing when it is present");
    expect(requests[0].prompt).toContain('"issues":[{"type":"missing_constraint"');
    expect(requests[0].prompt).toContain('"revisionInstructions":["specific correction"]');
  });

  it("returns a revision request on the first review and approval on the second", async () => {
    const adapter = createFixtureAdapter();
    const reviewInput = {
      acceptanceCriteria: ["The improved prompt must be reusable."],
      strictness: "medium" as const,
      audit,
      recommendation,
    };
    const first = await runQualityReviewer(adapter, reviewInput);
    expect(first.data.status).toBe("revision_requested");
    expect(first.data.revisionInstructions.length).toBeGreaterThan(0);

    const second = await runQualityReviewer(adapter, reviewInput);
    expect(second.data.status).toBe("approved");
  });
});
