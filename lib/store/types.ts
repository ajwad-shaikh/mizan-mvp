import type { Strictness } from "@/lib/engagements/schema";

export type EngagementStatus =
  | "draft"
  | "planning"
  | "running"
  | "review"
  | "awaiting_approval"
  | "review_failed"
  | "publishing"
  | "publication_uncertain"
  | "completed"
  | "failed";

export type ReviewOutcome = "approved" | "review_failed";

export type Engagement = {
  id: string;
  title: string;
  taskObjective: string;
  conversation: string;
  repositoryUrl: string;
  expectedOutcome?: string;
  status: EngagementStatus;
  strictness: Strictness;
  maxBudgetUsd: number;
  approvalRequired: boolean;
  outputType: "github_issue";
  totalInputTokens?: number;
  totalOutputTokens?: number;
  estimatedCostUsd?: number;
  totalLatencyMs?: number;
  reviewOutcome?: ReviewOutcome;
  revisionCount?: number;
  budgetExceeded?: boolean;
  githubIssueNumber?: number;
  githubIssueUrl?: string;
  error?: string;
  manualApprovalAt?: number;
  generatedMode?: "fixture" | "openai";
  publicationCapabilityHash?: string;
  createdAt: number;
  completedAt?: number;
};

export type CreateEngagementInput = {
  title: string;
  taskObjective: string;
  conversation: string;
  repositoryUrl: string;
  expectedOutcome?: string;
  strictness: Strictness;
  maxBudgetUsd: number;
  approvalRequired: boolean;
  outputType: "github_issue";
  generatedMode?: "fixture" | "openai";
  publicationCapabilityHash?: string;
};

export type AgentStepStatus = "pending" | "running" | "completed" | "failed";

export type AgentStep = {
  id: string;
  engagementId: string;
  agentName: string;
  version: number;
  status: AgentStepStatus;
  input: unknown;
  output?: unknown;
  inputTokens?: number;
  outputTokens?: number;
  estimatedCostUsd?: number;
  latencyMs?: number;
  error?: string;
  rawResponses?: string[];
  createdAt: number;
};

export type AddAgentStepInput = Omit<AgentStep, "id" | "createdAt">;

export type ArtifactType = "executive_report" | "improved_prompt" | "playbook" | "github_issue";

export type Artifact = {
  id: string;
  engagementId: string;
  type: ArtifactType;
  content: string;
  status: "draft" | "approved" | "published";
  externalUrl?: string;
  createdAt: number;
};

export type AddArtifactInput = Omit<Artifact, "id" | "createdAt">;

export type StoredPlan = {
  id: string;
  engagementId: string;
  engagementSummary: string;
  selectedAgents: unknown;
  skippedAgents: unknown;
  acceptanceCriteria: string[];
  requiresExternalResearch: boolean;
  requiresRepositoryEvidence: boolean;
  createdAt: number;
};

export type AddPlanInput = Omit<StoredPlan, "id" | "createdAt">;

export interface EngagementStore {
  createEngagement(input: CreateEngagementInput): Promise<Engagement>;
  getEngagement(id: string): Promise<Engagement | null>;
  listEngagements(): Promise<Engagement[]>;
  updateEngagement(id: string, patch: Partial<Engagement>): Promise<Engagement>;
  claimEngagementStatus(
    id: string,
    expectedStatus: EngagementStatus,
    nextStatus: EngagementStatus,
    patch?: Partial<Engagement>,
  ): Promise<Engagement | null>;
  addPlan(input: AddPlanInput): Promise<StoredPlan>;
  getPlan(engagementId: string): Promise<StoredPlan | null>;
  addAgentStep(input: AddAgentStepInput): Promise<AgentStep>;
  listAgentSteps(engagementId: string): Promise<AgentStep[]>;
  addArtifact(input: AddArtifactInput): Promise<Artifact>;
  listArtifacts(engagementId: string): Promise<Artifact[]>;
}
