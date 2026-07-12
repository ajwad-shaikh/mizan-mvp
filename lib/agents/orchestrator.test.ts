import { describe, it, expect } from "vitest";
import type { ModelAdapter, RawModelResponse } from "@/lib/ai/client";
import { runAgencyOrchestration, type TraceRecorder, type AgentStepRecord } from "./orchestrator";

function scriptedAdapter(script: Record<string, string[]>): ModelAdapter {
  const counts: Record<string, number> = {};
  return {
    mode: "fixture",
    async complete({ agentName }): Promise<RawModelResponse> {
      const i = counts[agentName] ?? 0;
      counts[agentName] = i + 1;
      const arr = script[agentName] ?? [];
      const content = arr[Math.min(i, arr.length - 1)] ?? "{}";
      return { content, model: "fixture-model", inputTokens: 10, outputTokens: 5 };
    },
  };
}

function collector(): TraceRecorder & { steps: AgentStepRecord[] } {
  const steps: AgentStepRecord[] = [];
  return { steps, async record(step) { steps.push(step); } };
}

const plan = JSON.stringify({
  engagementSummary: "Audit retry session.",
  selectedAgents: [
    { agent: "session_auditor", reason: "Reconstruct.", instructions: [] },
    { agent: "workflow_coach", reason: "Improve prompt.", instructions: [] },
    { agent: "quality_reviewer", reason: "Review deliverable.", instructions: [] },
  ],
  skippedAgents: [{ agent: "efficiency_analyst", reason: "No token metadata." }],
  acceptanceCriteria: ["The improved prompt must be reusable."],
  requiresExternalResearch: false,
  requiresRepositoryEvidence: false,
});

const audit = JSON.stringify({
  initialObjective: "Add retries.",
  finalObjective: "Add transient-only retries.",
  summary: "Constraints arrived late.",
  userTurns: 6,
  assistantTurns: 6,
  correctiveTurns: 3,
  requirementChanges: [],
  strengths: [],
  problems: [{ type: "missing_constraint", severity: "high", evidence: "turn 1" }],
  verificationObserved: true,
});

const coach = (label: string) =>
  JSON.stringify({
    improvedPrompt: `Objective\nAdd retries (${label}).`,
    recommendedContextBundle: [],
    recommendedWorkflow: [{ step: 1, action: "Inspect first.", reason: "Safety." }],
    verificationPlan: ["Run tests."],
    reusablePlaybook: { name: "Retry", content: "..." },
    coachingNotes: [],
  });

const approve = JSON.stringify({ status: "approved", score: 90, issues: [], revisionInstructions: [] });
const revise = JSON.stringify({
  status: "revision_requested",
  score: 55,
  issues: [{ type: "incomplete_prompt", description: "Missing backoff.", requiredAction: "Add it." }],
  revisionTarget: "workflow_coach",
  revisionInstructions: ["Add the capped backoff constraint."],
});

const engagement = {
  title: "Retry audit",
  taskObjective: "Add transient-only retries.",
  conversation: "User: add retries...",
  repositoryUrl: "https://github.com/acme/retry-service",
  strictness: "medium" as const,
  hasTokenMetadata: false,
};

const healthyPlan = JSON.stringify({
  engagementSummary: "Healthy session with clear constraints and verification.",
  selectedAgents: [{ agent: "session_auditor", reason: "Confirm session health.", instructions: [] }],
  skippedAgents: [
    { agent: "workflow_coach", reason: "No coaching intervention is needed." },
    { agent: "quality_reviewer", reason: "No generated coaching deliverable requires review." },
  ],
  acceptanceCriteria: ["Summarize the healthy workflow."],
  requiresExternalResearch: false,
  requiresRepositoryEvidence: false,
});

describe("runAgencyOrchestration", () => {
  it("approved path: composes a report and awaits approval", async () => {
    const rec = collector();
    const result = await runAgencyOrchestration({
      adapter: scriptedAdapter({
        agency_manager: [plan],
        session_auditor: [audit],
        workflow_coach: [coach("v1")],
        quality_reviewer: [approve],
      }),
      recorder: rec,
      engagement,
    });

    expect(result.outcome).toBe("awaiting_approval");
    expect(result.revisions).toBe(0);
    expect(result.reviews).toHaveLength(1);
    expect(result.report).not.toBeNull();
    expect(result.report?.improvedPrompt).toContain("v1");
    // Every agent step is recorded for the trace.
    expect(rec.steps.map((s) => s.agentName)).toEqual([
      "agency_manager",
      "session_auditor",
      "workflow_coach",
      "quality_reviewer",
    ]);
    expect(rec.steps.every((s) => s.status === "completed")).toBe(true);
  });

  it("one revision: routes back to the workflow coach then approves", async () => {
    const rec = collector();
    const result = await runAgencyOrchestration({
      adapter: scriptedAdapter({
        agency_manager: [plan],
        session_auditor: [audit],
        workflow_coach: [coach("v1"), coach("v2")],
        quality_reviewer: [revise, approve],
      }),
      recorder: rec,
      engagement,
    });

    expect(result.outcome).toBe("awaiting_approval");
    expect(result.revisions).toBe(1);
    expect(result.reviews).toHaveLength(2);
    expect(result.report?.improvedPrompt).toContain("v2");
    // The workflow coach ran a second version.
    const coachSteps = rec.steps.filter((s) => s.agentName === "workflow_coach");
    expect(coachSteps.map((s) => s.version)).toEqual([1, 2]);
    const reviewerSteps = rec.steps.filter((s) => s.agentName === "quality_reviewer");
    expect(reviewerSteps.map((s) => s.version)).toEqual([1, 2]);
  });

  it("second rejection: stops before publication with no report", async () => {
    const rec = collector();
    const result = await runAgencyOrchestration({
      adapter: scriptedAdapter({
        agency_manager: [plan],
        session_auditor: [audit],
        workflow_coach: [coach("v1"), coach("v2")],
        quality_reviewer: [revise, revise],
      }),
      recorder: rec,
      engagement,
    });

    expect(result.outcome).toBe("review_failed");
    expect(result.revisions).toBe(1);
    expect(result.reviews).toHaveLength(2);
    expect(result.report).toBeNull();
  });

  it("rejects a plan that omits the mandatory Quality Reviewer", async () => {
    const rec = collector();
    await expect(runAgencyOrchestration({
      adapter: scriptedAdapter({ agency_manager: [healthyPlan], session_auditor: [audit] }),
      recorder: rec,
      engagement,
    })).rejects.toThrow(/Quality Reviewer is mandatory/i);

    expect(rec.steps.map((step) => step.agentName)).toEqual(["agency_manager"]);
  });

  it("fails review when the requested revision target is unsupported instead of routing to the coach", async () => {
    const unsupported = JSON.stringify({ ...JSON.parse(revise), revisionTarget: "session_auditor" });
    const rec = collector();
    const result = await runAgencyOrchestration({
      adapter: scriptedAdapter({
        agency_manager: [plan],
        session_auditor: [audit],
        workflow_coach: [coach("v1")],
        quality_reviewer: [unsupported],
      }),
      recorder: rec,
      engagement,
    });

    expect(result.outcome).toBe("review_failed");
    expect(result.report).toBeNull();
    expect(rec.steps.filter((step) => step.agentName === "workflow_coach")).toHaveLength(1);
  });
});
