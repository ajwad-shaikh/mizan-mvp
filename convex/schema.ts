import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Real Convex persistence model for the first vertical slice. This source is
 * compiled and deployed by the Convex CLI (`npx convex dev`). The Next.js app
 * runs on an in-memory mirror of these tables when Convex is not configured, so
 * the schema here stays the single source of truth for the deployed backend.
 */
export default defineSchema({
  engagements: defineTable({
    title: v.string(),
    taskObjective: v.string(),
    conversation: v.string(),
    repositoryUrl: v.string(),
    expectedOutcome: v.optional(v.string()),
    status: v.union(
      v.literal("draft"),
      v.literal("planning"),
      v.literal("running"),
      v.literal("review"),
      v.literal("awaiting_approval"),
      v.literal("review_failed"),
      v.literal("publishing"),
      v.literal("publication_uncertain"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    strictness: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    maxBudgetUsd: v.number(),
    approvalRequired: v.boolean(),
    outputType: v.literal("github_issue"),
    totalInputTokens: v.optional(v.number()),
    totalOutputTokens: v.optional(v.number()),
    estimatedCostUsd: v.optional(v.number()),
    totalLatencyMs: v.optional(v.number()),
    reviewOutcome: v.optional(v.union(v.literal("approved"), v.literal("review_failed"))),
    revisionCount: v.optional(v.number()),
    budgetExceeded: v.optional(v.boolean()),
    githubIssueNumber: v.optional(v.number()),
    githubIssueUrl: v.optional(v.string()),
    error: v.optional(v.string()),
    manualApprovalAt: v.optional(v.number()),
    generatedMode: v.optional(v.union(v.literal("fixture"), v.literal("openai"))),
    publicationCapabilityHash: v.optional(v.string()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  }),

  plans: defineTable({
    engagementId: v.id("engagements"),
    engagementSummary: v.string(),
    selectedAgents: v.any(),
    skippedAgents: v.any(),
    acceptanceCriteria: v.array(v.string()),
    requiresExternalResearch: v.boolean(),
    requiresRepositoryEvidence: v.boolean(),
    createdAt: v.number(),
  }).index("by_engagement", ["engagementId"]),

  agentSteps: defineTable({
    engagementId: v.id("engagements"),
    parentStepId: v.optional(v.id("agentSteps")),
    agentName: v.string(),
    version: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    input: v.any(),
    output: v.optional(v.any()),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    estimatedCostUsd: v.optional(v.number()),
    latencyMs: v.optional(v.number()),
    error: v.optional(v.string()),
    rawResponses: v.optional(v.array(v.string())),
    createdAt: v.number(),
  }).index("by_engagement", ["engagementId"]),

  artifacts: defineTable({
    engagementId: v.id("engagements"),
    type: v.union(
      v.literal("executive_report"),
      v.literal("improved_prompt"),
      v.literal("playbook"),
      v.literal("github_issue"),
    ),
    content: v.string(),
    status: v.union(v.literal("draft"), v.literal("approved"), v.literal("published")),
    externalUrl: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_engagement", ["engagementId"]),
});
