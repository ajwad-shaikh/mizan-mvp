import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { createConvexStore, type ConvexClientLike } from "./convex-store";
import { createStoreForEnvironment } from "./index";

function doc(id: string, fields: Record<string, unknown>) {
  return { _id: id, _creationTime: 1, ...fields };
}

describe("Convex engagement store", () => {
  it("persists and maps an engagement through Convex", async () => {
    const calls: Array<{ kind: string; name: string; args: unknown }> = [];
    const engagement = doc("engagement-1", {
      title: "Retry audit",
      taskObjective: "Add retries",
      conversation: "user: add retries",
      repositoryUrl: "https://github.com/acme/repo",
      status: "draft",
      strictness: "medium",
      maxBudgetUsd: 1,
      approvalRequired: true,
      outputType: "github_issue",
      createdAt: 123,
    });
    const client: ConvexClientLike = {
      async mutation(reference, args) {
        calls.push({ kind: "mutation", name: reference, args });
        if (reference === "engagements:create") return "engagement-1";
        if (reference === "engagements:update") return { ...engagement, status: "running" };
        throw new Error(`Unexpected mutation ${reference}`);
      },
      async query(reference, args) {
        calls.push({ kind: "query", name: reference, args });
        if (reference === "engagements:get") return engagement;
        throw new Error(`Unexpected query ${reference}`);
      },
    };

    const store = createConvexStore(client, "server-secret");
    const created = await store.createEngagement({
      title: "Retry audit",
      taskObjective: "Add retries",
      conversation: "user: add retries",
      repositoryUrl: "https://github.com/acme/repo",
      strictness: "medium",
      maxBudgetUsd: 1,
      approvalRequired: true,
      outputType: "github_issue",
    });
    const updated = await store.updateEngagement(created.id, { status: "running" });

    expect(created.id).toBe("engagement-1");
    expect(updated.status).toBe("running");
    expect(calls.map((call) => `${call.kind}:${call.name}`)).toEqual([
      "mutation:engagements:create",
      "query:engagements:get",
      "mutation:engagements:update",
    ]);
    expect(calls.every((call) => (call.args as Record<string, unknown>).serverSecret === "server-secret")).toBe(true);
  });

  it("persists plans, trace steps, and artifacts", async () => {
    const records = new Map<string, unknown>();
    const client: ConvexClientLike = {
      async mutation(reference, args: any) {
        if (reference === "plans:add") {
          records.set("plan", doc("plan-1", { ...args, createdAt: 10 }));
          return "plan-1";
        }
        if (reference === "agentSteps:record") {
          records.set("step", doc("step-1", { ...args, createdAt: 11 }));
          return "step-1";
        }
        if (reference === "artifacts:add") {
          records.set("artifact", doc("artifact-1", { ...args, createdAt: 12 }));
          return "artifact-1";
        }
        throw new Error(`Unexpected mutation ${reference}`);
      },
      async query(reference) {
        if (reference === "plans:getForEngagement") return records.get("plan") ?? null;
        if (reference === "agentSteps:listForEngagement") return records.has("step") ? [records.get("step")] : [];
        if (reference === "artifacts:listForEngagement") return records.has("artifact") ? [records.get("artifact")] : [];
        throw new Error(`Unexpected query ${reference}`);
      },
    };
    const store = createConvexStore(client, "server-secret");

    const plan = await store.addPlan({
      engagementId: "engagement-1",
      engagementSummary: "summary",
      selectedAgents: [],
      skippedAgents: [],
      acceptanceCriteria: ["approved"],
      requiresExternalResearch: false,
      requiresRepositoryEvidence: false,
    });
    const step = await store.addAgentStep({
      engagementId: "engagement-1",
      agentName: "agency_manager",
      version: 1,
      status: "completed",
      input: {},
      output: {},
    });
    const artifact = await store.addArtifact({
      engagementId: "engagement-1",
      type: "executive_report",
      content: "{}",
      status: "draft",
    });

    expect(plan.id).toBe("plan-1");
    expect(step.id).toBe("step-1");
    expect(artifact.id).toBe("artifact-1");
  });

  it("delegates atomic status claims to one Convex mutation", async () => {
    const mutation = vi.fn(async () => doc("engagement-1", {
      title: "x", taskObjective: "x", conversation: "x",
      repositoryUrl: "https://github.com/acme/repo", status: "publishing",
      strictness: "medium", maxBudgetUsd: 1, approvalRequired: true,
      outputType: "github_issue", createdAt: 1,
    }));
    const store = createConvexStore({ mutation, query: vi.fn() }, "server-secret");

    const claimed = await store.claimEngagementStatus(
      "engagement-1",
      "awaiting_approval",
      "publishing",
      { manualApprovalAt: 123 },
    );

    expect(claimed?.status).toBe("publishing");
    expect(mutation).toHaveBeenCalledWith("engagements:claimStatus", {
      id: "engagement-1",
      expectedStatus: "awaiting_approval",
      nextStatus: "publishing",
      patch: { manualApprovalAt: 123 },
      clearFields: [],
      serverSecret: "server-secret",
    });
  });

  it("sends explicit clearFields when optional values are undefined", async () => {
    const mutation = vi.fn(async () => doc("engagement-1", {
      title: "x", taskObjective: "x", conversation: "x",
      repositoryUrl: "https://github.com/acme/repo", status: "completed",
      strictness: "medium", maxBudgetUsd: 1, approvalRequired: true,
      outputType: "github_issue", createdAt: 1,
    }));
    const store = createConvexStore({ mutation, query: vi.fn() }, "server-secret");

    await store.updateEngagement("engagement-1", {
      status: "completed",
      error: undefined,
      githubIssueUrl: undefined,
    });

    expect(mutation).toHaveBeenCalledWith("engagements:update", {
      id: "engagement-1",
      patch: { status: "completed" },
      clearFields: ["error", "githubIssueUrl"],
      serverSecret: "server-secret",
    });
  });

  it("selects the Convex store when a deployment URL is configured", () => {
    const client: ConvexClientLike = {
      mutation: vi.fn(),
      query: vi.fn(),
    };
    const factory = vi.fn(() => client);

    const store = createStoreForEnvironment("https://example.convex.cloud", "server-secret", factory);

    expect(store).toBeDefined();
    expect(factory).toHaveBeenCalledWith("https://example.convex.cloud");
  });

  it("fails closed when a Convex URL is configured without a server secret", () => {
    expect(() => createStoreForEnvironment("https://example.convex.cloud", undefined, vi.fn())).toThrow(
      /MIZAN_CONVEX_SERVER_SECRET/,
    );
  });

  it("requires server authentication and explicit engagement patch validators in Convex functions", () => {
    const root = process.cwd();
    for (const file of ["engagements.ts", "plans.ts", "agentSteps.ts", "artifacts.ts"]) {
      const source = readFileSync(`${root}/convex/${file}`, "utf8");
      expect(source).toContain("serverSecret: v.string()");
      expect(source).toContain("requireServerSecret(serverSecret)");
    }
    const engagements = readFileSync(`${root}/convex/engagements.ts`, "utf8");
    expect(engagements).not.toContain("patch: v.any()");
    expect(engagements).toContain("clearFields:");
    expect(engagements).toContain("ctx.db.patch(id, { [field]: undefined })");
  });
});
