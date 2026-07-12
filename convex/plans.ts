import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireServerSecret } from "./auth";

export const add = mutation({
  args: {
    serverSecret: v.string(),
    engagementId: v.id("engagements"),
    engagementSummary: v.string(),
    selectedAgents: v.any(),
    skippedAgents: v.any(),
    acceptanceCriteria: v.array(v.string()),
    requiresExternalResearch: v.boolean(),
    requiresRepositoryEvidence: v.boolean(),
  },
  handler: async (ctx, { serverSecret, ...args }) => {
    requireServerSecret(serverSecret);
    return await ctx.db.insert("plans", { ...args, createdAt: Date.now() });
  },
});

export const getForEngagement = query({
  args: { serverSecret: v.string(), engagementId: v.id("engagements") },
  handler: async (ctx, { serverSecret, engagementId }) => {
    requireServerSecret(serverSecret);
    return ctx.db.query("plans").withIndex("by_engagement", (q) => q.eq("engagementId", engagementId)).first();
  },
});
