import { getStore } from "@/lib/store";
import type { EngagementStore } from "@/lib/store/types";
import { createModelAdapter, type ModelAdapter } from "@/lib/ai/client";
import { createGitHubClientFromEnv, type GitHubIssueApi } from "@/lib/github/client";
import { runAgencyOrchestration, type AgentStepRecord, type TraceRecorder } from "@/lib/agents/orchestrator";
import { publishReportAsIssue } from "@/lib/github/issues";
import { EngagementIntakeSchema, parseGitHubRepoUrl, type EngagementIntake } from "./schema";
import type { ExecutiveReport } from "@/lib/agents/types";
import { ExecutiveReportSchema } from "@/lib/agents/schemas";
import { redactSecrets } from "@/lib/security/redact";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export type StartDeps = {
  store?: EngagementStore;
  adapter?: ModelAdapter;
  githubApi?: GitHubIssueApi | null;
  allowedRepositories?: string[];
  onPublicationCapability?: (engagementId: string, capability: string) => void | Promise<void>;
};

/**
 * Create an engagement, run the agency to completion (through one possible
 * reviewer revision), persist every agent step, the plan, and the draft report,
 * and leave the engagement awaiting manual approval (or marked review_failed).
 */
export async function startEngagement(intake: EngagementIntake, deps: StartDeps = {}): Promise<string> {
  // Service-level validation prevents typed/internal callers from bypassing the
  // form bounds or starting model work with an insufficient budget.
  const validated = EngagementIntakeSchema.parse(intake);
  const deploymentBudget = deploymentMaxBudgetUsd(process.env.MIZAN_MAX_ENGAGEMENT_BUDGET_USD);
  if (validated.maxBudgetUsd > deploymentBudget) {
    throw new Error(`Requested budget exceeds the deployment maximum of $${deploymentBudget.toFixed(2)}.`);
  }
  const safeIntake = {
    ...validated,
    title: redactSecrets(validated.title),
    taskObjective: redactSecrets(validated.taskObjective),
    conversation: redactSecrets(validated.conversation),
    expectedOutcome: validated.expectedOutcome ? redactSecrets(validated.expectedOutcome) : undefined,
  };
  const store = deps.store ?? getStore();
  const adapter = deps.adapter ?? createModelAdapter();
  const publicationCapability = randomBytes(32).toString("base64url");

  const engagement = await store.createEngagement({
    title: safeIntake.title,
    taskObjective: safeIntake.taskObjective,
    conversation: safeIntake.conversation,
    repositoryUrl: safeIntake.repositoryUrl,
    expectedOutcome: safeIntake.expectedOutcome,
    strictness: safeIntake.strictness,
    maxBudgetUsd: safeIntake.maxBudgetUsd,
    approvalRequired: safeIntake.approvalRequired,
    outputType: "github_issue",
    generatedMode: adapter.mode,
    publicationCapabilityHash: hashCapability(publicationCapability),
  });
  await deps.onPublicationCapability?.(engagement.id, publicationCapability);

  await store.updateEngagement(engagement.id, { status: "running" });

  const totals = { inputTokens: 0, outputTokens: 0, cost: 0, latency: 0 };
  const recorder: TraceRecorder = {
    async record(step: AgentStepRecord) {
      totals.inputTokens += step.inputTokens ?? 0;
      totals.outputTokens += step.outputTokens ?? 0;
      totals.cost += step.estimatedCostUsd ?? 0;
      totals.latency += step.latencyMs ?? 0;
      await store.addAgentStep({
        engagementId: engagement.id,
        agentName: step.agentName,
        version: step.version,
        status: step.status,
        input: step.input,
        output: step.output,
        inputTokens: step.inputTokens,
        outputTokens: step.outputTokens,
        estimatedCostUsd: step.estimatedCostUsd,
        latencyMs: step.latencyMs,
        error: step.error,
        rawResponses: step.rawResponses,
      });
    },
  };

  try {
    const result = await runAgencyOrchestration({
      adapter,
      recorder,
      engagement: {
        title: safeIntake.title,
        taskObjective: safeIntake.taskObjective,
        conversation: safeIntake.conversation,
        repositoryUrl: safeIntake.repositoryUrl,
        strictness: safeIntake.strictness,
        hasTokenMetadata: false,
      },
    });

    const estimatedCostUsd = round(totals.cost);

    await store.addPlan({
      engagementId: engagement.id,
      engagementSummary: result.plan.engagementSummary,
      selectedAgents: result.plan.selectedAgents,
      skippedAgents: result.plan.skippedAgents,
      acceptanceCriteria: result.plan.acceptanceCriteria,
      requiresExternalResearch: result.plan.requiresExternalResearch,
      requiresRepositoryEvidence: result.plan.requiresRepositoryEvidence,
    });

    const common = {
      totalInputTokens: totals.inputTokens,
      totalOutputTokens: totals.outputTokens,
      estimatedCostUsd,
      totalLatencyMs: totals.latency,
      revisionCount: result.revisions,
      budgetExceeded: estimatedCostUsd > safeIntake.maxBudgetUsd,
    };

    if (result.outcome === "awaiting_approval" && result.report) {
      await store.addArtifact({
        engagementId: engagement.id,
        type: "executive_report",
        content: JSON.stringify(result.report),
        status: "approved",
      });
      await store.updateEngagement(engagement.id, {
        ...common,
        status: "awaiting_approval",
        reviewOutcome: "approved",
      });
    } else {
      await store.updateEngagement(engagement.id, {
        ...common,
        status: "review_failed",
        reviewOutcome: "review_failed",
      });
    }
  } catch (err) {
    await store.updateEngagement(engagement.id, {
      status: "failed",
      error: err instanceof Error ? err.message : String(err),
    });
  }

  if (!safeIntake.approvalRequired) {
    const current = await store.getEngagement(engagement.id);
    if (current?.status === "awaiting_approval") {
      const automatic = await approveAndPublishEngagement(engagement.id, publicationCapability, {
        store,
        githubApi: deps.githubApi,
        allowedRepositories: deps.allowedRepositories,
        automatic: true,
      });
      if (!automatic.ok) {
        await store.updateEngagement(engagement.id, {
          error: `Automatic publication blocked: ${automatic.error ?? "safe publication prerequisites were not met."}`,
        });
      }
    }
  }

  return engagement.id;
}

export type PublishDeps = {
  store?: EngagementStore;
  githubApi?: GitHubIssueApi | null;
  allowedRepositories?: string[];
  automatic?: boolean;
};

export type PublishOutcome = { ok: boolean; issueUrl?: string; issueNumber?: number; error?: string };

/** Claim and publish exactly once after validating the bearer capability and deployment policy. */
export async function approveAndPublishEngagement(
  engagementId: string,
  publicationCapability: string,
  deps: PublishDeps = {},
): Promise<PublishOutcome> {
  const store = deps.store ?? getStore();
  const engagement = await store.getEngagement(engagementId);
  if (!engagement) return { ok: false, error: "Engagement not found." };
  if (!capabilitiesMatch(publicationCapability, engagement.publicationCapabilityHash)) {
    return { ok: false, error: "Invalid publication capability." };
  }
  if (engagement.status !== "awaiting_approval") {
    return { ok: false, error: `Engagement is not awaiting approval (status: ${engagement.status}).` };
  }
  if (engagement.reviewOutcome !== "approved") {
    return { ok: false, error: "Cannot publish: the Quality Reviewer has not approved this report." };
  }
  if (engagement.generatedMode !== "openai") {
    return { ok: false, error: "Fixture-generated reports are demo-only and cannot be published as real issues." };
  }

  const repo = parseGitHubRepoUrl(engagement.repositoryUrl);
  if (!repo) return { ok: false, error: "Invalid repository URL." };
  const repositoryKey = `${repo.owner}/${repo.repo}`.toLowerCase();
  const allowlist = (deps.allowedRepositories ?? repositoryAllowlistFromEnv()).map((value) => value.toLowerCase());
  if (!allowlist.includes(repositoryKey)) {
    return { ok: false, error: `Repository ${repositoryKey} is not in the server publication allowlist.` };
  }

  const api = deps.githubApi === undefined ? createGitHubClientFromEnv() : deps.githubApi;
  if (!api) return { ok: false, error: "GITHUB_TOKEN is not configured, so no real GitHub issue was created." };

  const report = await loadDraftReport(store, engagementId);
  if (!report) return { ok: false, error: "No approved report artifact was found to publish." };

  const claimPatch = deps.automatic ? { error: undefined } : { manualApprovalAt: Date.now(), error: undefined };
  const claimed = await store.claimEngagementStatus(
    engagementId,
    "awaiting_approval",
    "publishing",
    claimPatch,
  );
  if (!claimed) return { ok: false, error: "Publication was already claimed or replayed." };

  let created: { issueNumber: number; issueUrl: string };
  try {
    created = await publishReportAsIssue({ api, repo, report });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    const uncertain = `Publication uncertain: GitHub may have accepted the request (${error}). Do not retry automatically.`;
    await store.updateEngagement(engagementId, { status: "publication_uncertain", error: uncertain });
    return { ok: false, error: uncertain };
  }

  try {
    await store.addArtifact({
      engagementId,
      type: "github_issue",
      content: created.issueUrl,
      status: "published",
      externalUrl: created.issueUrl,
    });
    await store.updateEngagement(engagementId, {
      status: "completed",
      githubIssueNumber: created.issueNumber,
      githubIssueUrl: created.issueUrl,
      completedAt: Date.now(),
      error: undefined,
    });
    return { ok: true, ...created };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    const error = `Publication uncertain: GitHub may have created issue ${created.issueUrl}, but persistence failed (${detail}). Do not retry automatically.`;
    try {
      await store.updateEngagement(engagementId, {
        status: "publication_uncertain",
        githubIssueNumber: created.issueNumber,
        githubIssueUrl: created.issueUrl,
        error,
      });
    } catch {
      // The outcome still tells the caller not to retry if persistence is fully unavailable.
    }
    return { ok: false, issueNumber: created.issueNumber, issueUrl: created.issueUrl, error };
  }
}

function repositoryAllowlistFromEnv(): string[] {
  return (process.env.MIZAN_GITHUB_REPOSITORY_ALLOWLIST ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function hashCapability(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function capabilitiesMatch(provided: string, expectedHash: string | undefined): boolean {
  if (!provided || !expectedHash) return false;
  const left = Buffer.from(hashCapability(provided), "hex");
  const right = Buffer.from(expectedHash, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

async function loadDraftReport(store: EngagementStore, engagementId: string): Promise<ExecutiveReport | null> {
  const artifacts = await store.listArtifacts(engagementId);
  const artifact = artifacts.find((a) => a.type === "executive_report" && a.status === "approved");
  if (!artifact) return null;
  try {
    return ExecutiveReportSchema.parse(JSON.parse(artifact.content));
  } catch {
    return null;
  }
}

function deploymentMaxBudgetUsd(raw: string | undefined): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0.01 && parsed <= 100 ? parsed : 5;
}

function round(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000;
}
