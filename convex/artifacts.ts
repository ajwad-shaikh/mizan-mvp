import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireServerSecret } from "./auth";

export const add = mutation({
  args: {
    serverSecret: v.string(),
    engagementId: v.id("engagements"),
    type: v.union(v.literal("executive_report"), v.literal("improved_prompt"), v.literal("playbook"), v.literal("github_issue")),
    content: v.string(),
    status: v.union(v.literal("draft"), v.literal("approved"), v.literal("published")),
    externalUrl: v.optional(v.string()),
  },
  handler: async (ctx, { serverSecret, ...args }) => {
    requireServerSecret(serverSecret);
    return await ctx.db.insert("artifacts", { ...args, createdAt: Date.now() });
  },
});

export const listForEngagement = query({
  args: { serverSecret: v.string(), engagementId: v.id("engagements") },
  handler: async (ctx, { serverSecret, engagementId }) => {
    requireServerSecret(serverSecret);
    return ctx.db.query("artifacts").withIndex("by_engagement", (q) => q.eq("engagementId", engagementId)).collect();
  },
});
