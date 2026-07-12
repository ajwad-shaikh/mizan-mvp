import { describe, it, expect, beforeEach } from "vitest";
import { createMemoryStore } from "./memory";

function baseEngagement() {
  return {
    title: "Retry audit",
    taskObjective: "Add transient-only retries.",
    conversation: "User: add retries",
    repositoryUrl: "https://github.com/acme/retry-service",
    strictness: "medium" as const,
    maxBudgetUsd: 5,
    approvalRequired: true,
    outputType: "github_issue" as const,
  };
}

describe("memory store", () => {
  let store: ReturnType<typeof createMemoryStore>;
  beforeEach(() => {
    store = createMemoryStore();
  });

  it("creates an engagement in draft status with an id and timestamp", async () => {
    const e = await store.createEngagement(baseEngagement());
    expect(e.id).toBeTruthy();
    expect(e.status).toBe("draft");
    expect(e.createdAt).toBeGreaterThan(0);
    expect(await store.getEngagement(e.id)).toMatchObject({ id: e.id, title: "Retry audit" });
  });

  it("advances engagement status via patch", async () => {
    const e = await store.createEngagement(baseEngagement());
    const updated = await store.updateEngagement(e.id, { status: "awaiting_approval" });
    expect(updated.status).toBe("awaiting_approval");
    expect((await store.getEngagement(e.id))?.status).toBe("awaiting_approval");
  });

  it("atomically claims an engagement only from the expected status", async () => {
    const e = await store.createEngagement(baseEngagement());
    await store.updateEngagement(e.id, { status: "awaiting_approval" });

    const [first, second] = await Promise.all([
      store.claimEngagementStatus(e.id, "awaiting_approval", "publishing"),
      store.claimEngagementStatus(e.id, "awaiting_approval", "publishing"),
    ]);

    expect([first, second].filter(Boolean)).toHaveLength(1);
    expect((await store.getEngagement(e.id))?.status).toBe("publishing");
  });

  it("records and returns agent steps in insertion order", async () => {
    const e = await store.createEngagement(baseEngagement());
    await store.addAgentStep({ engagementId: e.id, agentName: "agency_manager", version: 1, status: "completed", input: {} });
    await store.addAgentStep({ engagementId: e.id, agentName: "session_auditor", version: 1, status: "completed", input: {} });
    const steps = await store.listAgentSteps(e.id);
    expect(steps.map((s) => s.agentName)).toEqual(["agency_manager", "session_auditor"]);
  });

  it("stores and lists artifacts scoped to an engagement", async () => {
    const e = await store.createEngagement(baseEngagement());
    await store.addArtifact({ engagementId: e.id, type: "executive_report", content: "{}", status: "draft" });
    const other = await store.createEngagement(baseEngagement());
    await store.addArtifact({ engagementId: other.id, type: "github_issue", content: "x", status: "published" });
    const artifacts = await store.listArtifacts(e.id);
    expect(artifacts).toHaveLength(1);
    expect(artifacts[0].type).toBe("executive_report");
  });

  it("returns null for a missing engagement", async () => {
    expect(await store.getEngagement("nope")).toBeNull();
  });
});
