import { describe, it, expect } from "vitest";
import { publishReportAsIssue } from "./issues";
import type { GitHubIssueApi, CreateIssueInput } from "./client";
import type { ExecutiveReport } from "@/lib/agents/types";

const report: ExecutiveReport = {
  taskName: "Add transient-error retries",
  executiveSummary: "Summary.",
  whatHappened: "Constraints arrived late.",
  findings: [],
  improvedPrompt: "Objective\nAdd retries.",
  recommendedContextBundle: [],
  recommendedWorkflow: [],
  verificationPlan: ["Run tests."],
  reusablePlaybook: { name: "Retry", content: "..." },
  methodologyAndLimitations: "Conversation only.",
};

function fakeApi(): GitHubIssueApi & { calls: CreateIssueInput[] } {
  const calls: CreateIssueInput[] = [];
  return {
    calls,
    async createIssue(input: CreateIssueInput) {
      calls.push(input);
      return { number: 42, htmlUrl: `https://github.com/${input.owner}/${input.repo}/issues/42` };
    },
  };
}

describe("publishReportAsIssue", () => {
  it("creates an issue in the target repo and returns its number and URL", async () => {
    const api = fakeApi();
    const result = await publishReportAsIssue({
      api,
      repo: { owner: "acme", repo: "retry-service" },
      report,
    });

    expect(result.issueNumber).toBe(42);
    expect(result.issueUrl).toBe("https://github.com/acme/retry-service/issues/42");
    expect(api.calls).toHaveLength(1);
    expect(api.calls[0].owner).toBe("acme");
    expect(api.calls[0].repo).toBe("retry-service");
    expect(api.calls[0].title).toBe("AI Workflow Audit: Add transient-error retries");
    expect(api.calls[0].body).toContain("## Executive Summary");
  });
});
