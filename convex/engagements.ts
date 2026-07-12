import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireServerSecret } from "./auth";

const status = v.union(
  v.literal("draft"), v.literal("planning"), v.literal("running"), v.literal("review"),
  v.literal("awaiting_approval"), v.literal("review_failed"), v.literal("publishing"),
  v.literal("publication_uncertain"), v.literal("completed"), v.literal("failed"),
);

const patch = v.object({
  status: v.optional(status),
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
  completedAt: v.optional(v.number()),
});

const clearableField = v.union(
  v.literal("totalInputTokens"), v.literal("totalOutputTokens"), v.literal("estimatedCostUsd"),
  v.literal("totalLatencyMs"), v.literal("reviewOutcome"), v.literal("revisionCount"),
  v.literal("budgetExceeded"), v.literal("githubIssueNumber"), v.literal("githubIssueUrl"),
  v.literal("error"), v.literal("manualApprovalAt"), v.literal("generatedMode"), v.literal("completedAt"),
);

/** Create a new engagement in draft status. */
export const create = mutation({
  args: {
    serverSecret: v.string(),
    title: v.string(),
    taskObjective: v.string(),
    conversation: v.string(),
    repositoryUrl: v.string(),
    expectedOutcome: v.optional(v.string()),
    strictness: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    maxBudgetUsd: v.number(),
    approvalRequired: v.boolean(),
    outputType: v.literal("github_issue"),
    generatedMode: v.optional(v.union(v.literal("fixture"), v.literal("openai"))),
    publicationCapabilityHash: v.optional(v.string()),
  },
  handler: async (ctx, { serverSecret, ...args }) => {
    requireServerSecret(serverSecret);
    return await ctx.db.insert("engagements", { ...args, status: "draft", createdAt: Date.now() });
  },
});

/** Advance an engagement's explicit mutable fields. */
export const update = mutation({
  args: { serverSecret: v.string(), id: v.id("engagements"), patch, clearFields: v.array(clearableField) },
  handler: async (ctx, { serverSecret, id, patch, clearFields }) => {
    requireServerSecret(serverSecret);
    await ctx.db.patch(id, patch);
    for (const field of clearFields) await ctx.db.patch(id, { [field]: undefined });
    return await ctx.db.get(id);
  },
});

/** Atomically transition status; concurrent/replayed claims return null. */
export const claimStatus = mutation({
  args: {
    serverSecret: v.string(), id: v.id("engagements"), expectedStatus: status,
    nextStatus: status, patch, clearFields: v.array(clearableField),
  },
  handler: async (ctx, { serverSecret, id, expectedStatus, nextStatus, patch, clearFields }) => {
    requireServerSecret(serverSecret);
    const engagement = await ctx.db.get(id);
    if (!engagement || engagement.status !== expectedStatus) return null;
    await ctx.db.patch(id, { ...patch, status: nextStatus });
    for (const field of clearFields) await ctx.db.patch(id, { [field]: undefined });
    return await ctx.db.get(id);
  },
});

export const get = query({
  args: { serverSecret: v.string(), id: v.id("engagements") },
  handler: async (ctx, { serverSecret, id }) => {
    requireServerSecret(serverSecret);
    return ctx.db.get(id);
  },
});

export const list = query({
  args: { serverSecret: v.string() },
  handler: async (ctx, { serverSecret }) => {
    requireServerSecret(serverSecret);
    return ctx.db.query("engagements").order("desc").collect();
  },
});
