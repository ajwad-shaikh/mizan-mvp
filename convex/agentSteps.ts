import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireServerSecret } from "./auth";

export const start = mutation({
  args: {
    serverSecret: v.string(), engagementId: v.id("engagements"), parentStepId: v.optional(v.id("agentSteps")),
    agentName: v.string(), version: v.number(), input: v.any(),
  },
  handler: async (ctx, { serverSecret, ...args }) => {
    requireServerSecret(serverSecret);
    return await ctx.db.insert("agentSteps", { ...args, status: "running", createdAt: Date.now() });
  },
});

export const complete = mutation({
  args: {
    serverSecret: v.string(), id: v.id("agentSteps"), output: v.any(), inputTokens: v.number(),
    outputTokens: v.number(), estimatedCostUsd: v.number(), latencyMs: v.number(),
    rawResponses: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { serverSecret, id, ...patch }) => {
    requireServerSecret(serverSecret);
    await ctx.db.patch(id, { ...patch, status: "completed" });
  },
});

export const fail = mutation({
  args: { serverSecret: v.string(), id: v.id("agentSteps"), error: v.string(), rawResponses: v.optional(v.array(v.string())) },
  handler: async (ctx, { serverSecret, id, ...patch }) => {
    requireServerSecret(serverSecret);
    await ctx.db.patch(id, { ...patch, status: "failed" });
  },
});

export const record = mutation({
  args: {
    serverSecret: v.string(), engagementId: v.id("engagements"), agentName: v.string(), version: v.number(),
    status: v.union(v.literal("pending"), v.literal("running"), v.literal("completed"), v.literal("failed")),
    input: v.any(), output: v.optional(v.any()), inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()), estimatedCostUsd: v.optional(v.number()), latencyMs: v.optional(v.number()),
    error: v.optional(v.string()), rawResponses: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { serverSecret, ...args }) => {
    requireServerSecret(serverSecret);
    return ctx.db.insert("agentSteps", { ...args, createdAt: Date.now() });
  },
});

export const listForEngagement = query({
  args: { serverSecret: v.string(), engagementId: v.id("engagements") },
  handler: async (ctx, { serverSecret, engagementId }) => {
    requireServerSecret(serverSecret);
    return ctx.db.query("agentSteps").withIndex("by_engagement", (q) => q.eq("engagementId", engagementId)).collect();
  },
});
