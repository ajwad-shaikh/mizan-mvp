import { describe, it, expect } from "vitest";
import { renderGitHubIssue } from "./github-markdown";
import type { ExecutiveReport } from "@/lib/agents/types";

const report: ExecutiveReport = {
  taskName: "Add transient-error retries",
  executiveSummary: "The session succeeded but took avoidable iterations.",
  whatHappened: "Constraints arrived after implementation began.",
  findings: [{ title: "Late acceptance criteria", detail: "Scope arrived in turn 3.", severity: "high" }],
  improvedPrompt: "Objective\nAdd retries for transient errors only.",
  recommendedContextBundle: ["internal/retry/policy.go"],
  recommendedWorkflow: [{ step: 1, action: "Inspect the retry abstraction.", reason: "Avoid assumptions." }],
  verificationPlan: ["Run existing unit tests."],
  reusablePlaybook: { name: "Retry Behaviour Change", content: "State invariants first." },
  methodologyAndLimitations: "Based only on the supplied conversation.",
};

describe("renderGitHubIssue", () => {
  it("derives a deterministic title from the task name", () => {
    expect(renderGitHubIssue(report).title).toBe("AI Workflow Audit: Add transient-error retries");
  });

  it("renders the required sections in order", () => {
    const { body } = renderGitHubIssue(report);
    const order = [
      "# AI Workflow Audit: Add transient-error retries",
      "## Executive Summary",
      "## What Happened",
      "## Primary Findings",
      "## Improved Prompt",
      "## Recommended Context Bundle",
      "## Recommended Workflow",
      "## Verification Plan",
      "## Reusable Playbook",
      "## Methodology and Limitations",
    ];
    let cursor = -1;
    for (const heading of order) {
      const idx = body.indexOf(heading);
      expect(idx, `missing or out-of-order: ${heading}`).toBeGreaterThan(cursor);
      cursor = idx;
    }
  });

  it("fences the improved prompt so it is copy-pasteable", () => {
    const { body } = renderGitHubIssue(report);
    expect(body).toContain("```text\nObjective\nAdd retries for transient errors only.\n```");
  });

  it("is deterministic for the same input", () => {
    expect(renderGitHubIssue(report).body).toBe(renderGitHubIssue(report).body);
  });

  it("omits the efficiency section when no estimate is present", () => {
    expect(renderGitHubIssue(report).body).not.toContain("## Estimated Efficiency Improvement");
  });

  it("includes a labelled efficiency section when an estimate is present", () => {
    const withEstimate: ExecutiveReport = {
      ...report,
      estimatedEfficiency: { summary: "Roughly 2-3 avoidable turns.", isEstimate: true, basis: "Corrective turns." },
    };
    const { body } = renderGitHubIssue(withEstimate);
    expect(body).toContain("## Estimated Efficiency Improvement");
    expect(body).toContain("_Estimate_");
    expect(body).toContain("Roughly 2-3 avoidable turns.");
  });
});
