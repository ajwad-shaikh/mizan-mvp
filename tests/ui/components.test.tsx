import { describe, it, expect } from "vitest";
import { isValidElement } from "react";
import { createMemoryStore } from "@/lib/store/memory";
import { createFixtureAdapter } from "@/lib/ai/client";
import { startEngagement } from "@/lib/engagements/service";
import type { ExecutiveReport } from "@/lib/agents/types";
import { StatusBadge } from "@/components/agency/status-badge";
import { AgencyPlanView } from "@/components/agency/agency-plan";
import { ReviewerDecision } from "@/components/agency/reviewer-decision";
import { TraceTree } from "@/components/trace/trace-tree";
import { TraceNode } from "@/components/trace/trace-node";
import { ExecutiveSummary } from "@/components/report/executive-summary";
import { PublicationPreview } from "@/components/publication/publication-preview";
import { GitHubIssueLink } from "@/components/publication/github-issue-link";

const intake = {
  title: "Retry implementation audit",
  taskObjective: "Add retries for transient errors only.",
  conversation: "User: add retries\nAssistant: done\nUser: only transient ones",
  repositoryUrl: "https://github.com/acme/retry-service",
  strictness: "medium" as const,
  maxBudgetUsd: 5,
  approvalRequired: true,
  outputType: "github_issue" as const,
};

/**
 * Smoke-render the presentational components used on /runs/[id] with the data a
 * real engagement produces. Invoking each synchronous component executes its
 * inline .map()/property access, catching bad field reads that typecheck and
 * build cannot see.
 */
describe("run detail components render with real engagement data", () => {
  it("does not throw and returns valid elements for the populated read path", async () => {
    const store = createMemoryStore();
    const id = await startEngagement(intake, { store, adapter: createFixtureAdapter() });

    const engagement = await store.getEngagement(id);
    const plan = await store.getPlan(id);
    const steps = await store.listAgentSteps(id);
    const artifacts = await store.listArtifacts(id);

    expect(engagement).not.toBeNull();
    expect(plan).not.toBeNull();
    expect(steps.length).toBeGreaterThan(0);

    const reportArtifact = artifacts.find((a) => a.type === "executive_report");
    const report = JSON.parse(reportArtifact!.content) as ExecutiveReport;
    const reviewerSteps = steps.filter((s) => s.agentName === "quality_reviewer");

    expect(isValidElement(StatusBadge({ status: engagement!.status }))).toBe(true);
    expect(isValidElement(AgencyPlanView({ plan: plan! }))).toBe(true);
    expect(isValidElement(ReviewerDecision({ reviewerSteps }))).toBe(true);
    expect(isValidElement(TraceTree({ steps }))).toBe(true);
    for (const step of steps) {
      expect(isValidElement(TraceNode({ step }))).toBe(true);
    }
    expect(isValidElement(ExecutiveSummary({ report }))).toBe(true);
    expect(isValidElement(PublicationPreview({ report }))).toBe(true);
    expect(
      isValidElement(GitHubIssueLink({ url: "https://github.com/acme/retry-service/issues/1", number: 1 })),
    ).toBe(true);
  });
});
