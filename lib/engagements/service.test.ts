import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { createMemoryStore } from "@/lib/store/memory";
import { createFixtureAdapter, type ModelAdapter, type ModelRequest } from "@/lib/ai/client";
import type { GitHubIssueApi, CreateIssueInput } from "@/lib/github/client";
import type { EngagementStore } from "@/lib/store/types";
import { startEngagement, approveAndPublishEngagement } from "./service";
import { MAX_CONVERSATION_CHARS, MINIMUM_RUN_BUDGET_USD, type EngagementIntake } from "./schema";

const intake: EngagementIntake = {
  title: "Retry implementation audit",
  taskObjective: "Add retries for transient errors only.",
  conversation: "User: add retries\nAssistant: done\nUser: only transient ones",
  repositoryUrl: "https://github.com/acme/retry-service",
  strictness: "medium",
  maxBudgetUsd: 5,
  approvalRequired: true,
  outputType: "github_issue",
};

function realFixtureAdapter(): ModelAdapter {
  const fixture = createFixtureAdapter();
  return { mode: "openai", complete: (request) => fixture.complete(request) };
}

function fakeGitHub(delayMs = 0): GitHubIssueApi & { calls: CreateIssueInput[] } {
  const calls: CreateIssueInput[] = [];
  return {
    calls,
    async createIssue(input: CreateIssueInput) {
      calls.push(input);
      if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
      return { number: 7, htmlUrl: `https://github.com/${input.owner}/${input.repo}/issues/7` };
    },
  };
}

async function startWithCapability(
  value: EngagementIntake,
  deps: Parameters<typeof startEngagement>[1],
): Promise<{ id: string; capability: string }> {
  let capability = "";
  const id = await startEngagement(value, {
    ...deps,
    onPublicationCapability(_id, value) {
      capability = value;
    },
  });
  if (!capability) throw new Error("missing publication capability");
  return { id, capability };
}

const allowedRepositories = ["acme/retry-service"];

describe("startEngagement", () => {
  it("runs the agency, persists trace + plan + report, and awaits approval", async () => {
    const store = createMemoryStore();
    const { id, capability } = await startWithCapability(intake, { store, adapter: createFixtureAdapter() });

    const engagement = await store.getEngagement(id);
    expect(engagement?.status).toBe("awaiting_approval");
    expect(engagement?.reviewOutcome).toBe("approved");
    expect(engagement?.revisionCount).toBe(1);
    expect(engagement?.estimatedCostUsd).toBeGreaterThan(0);
    expect(engagement?.generatedMode).toBe("fixture");
    expect(engagement?.publicationCapabilityHash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(engagement)).not.toContain("publicationCapability\"");

    const plan = await store.getPlan(id);
    expect(plan?.acceptanceCriteria.length).toBeGreaterThan(0);
    const steps = await store.listAgentSteps(id);
    expect(steps.filter((s) => s.agentName === "workflow_coach")).toHaveLength(2);
    const artifacts = await store.listArtifacts(id);
    expect(artifacts.some((a) => a.type === "executive_report" && a.status === "approved")).toBe(true);
  });

  it("redacts obvious submitted secrets before model calls and persistence", async () => {
    const store = createMemoryStore();
    const fixture = createFixtureAdapter();
    const requests: ModelRequest[] = [];
    const adapter: ModelAdapter = {
      mode: "fixture",
      async complete(request) {
        requests.push(request);
        return fixture.complete(request);
      },
    };
    const secret = "sk-proj-abcdefghijklmnopqrstuvwxyz123456";

    const id = await startEngagement(
      { ...intake, conversation: `User: use API_KEY=${secret} but preserve this instruction.` },
      { store, adapter },
    );

    const engagement = await store.getEngagement(id);
    expect(engagement?.conversation).toContain("[REDACTED]");
    expect(engagement?.conversation).toContain("preserve this instruction");
    expect(JSON.stringify(requests)).not.toContain(secret);
    expect(JSON.stringify(await store.listAgentSteps(id))).not.toContain(secret);
  });

  it("rejects oversized conversations before creating an engagement or calling a model", async () => {
    const store = createMemoryStore();
    let calls = 0;
    const adapter: ModelAdapter = {
      mode: "fixture",
      async complete() {
        calls += 1;
        throw new Error("must not be called");
      },
    };
    await expect(
      startEngagement({ ...intake, conversation: "x".repeat(MAX_CONVERSATION_CHARS + 1) }, { store, adapter }),
    ).rejects.toThrow(/conversation/i);
    expect(calls).toBe(0);
    expect(await store.listEngagements()).toHaveLength(0);
  });

  it("rejects an insufficient budget before calling a model", async () => {
    const store = createMemoryStore();
    let calls = 0;
    const adapter: ModelAdapter = {
      mode: "fixture",
      async complete() {
        calls += 1;
        throw new Error("must not be called");
      },
    };
    await expect(
      startEngagement({ ...intake, maxBudgetUsd: MINIMUM_RUN_BUDGET_USD / 2 }, { store, adapter }),
    ).rejects.toThrow(/budget/i);
    expect(calls).toBe(0);
  });

  it("auto-publishes approvalRequired=false only when all safe prerequisites are present", async () => {
    const store = createMemoryStore();
    const api = fakeGitHub();
    const id = await startEngagement(
      { ...intake, approvalRequired: false },
      { store, adapter: realFixtureAdapter(), githubApi: api, allowedRepositories },
    );

    expect((await store.getEngagement(id))?.status).toBe("completed");
    expect(api.calls).toHaveLength(1);
  });

  it("leaves a clear blocked state when approvalRequired=false lacks safe publication prerequisites", async () => {
    const store = createMemoryStore();
    const id = await startEngagement(
      { ...intake, approvalRequired: false },
      { store, adapter: realFixtureAdapter(), githubApi: null, allowedRepositories },
    );

    const engagement = await store.getEngagement(id);
    expect(engagement?.status).toBe("awaiting_approval");
    expect(engagement?.error).toMatch(/automatic publication blocked/i);
  });
});

describe("approveAndPublishEngagement", () => {
  it("publishes a real-mode report with the capability to an allowlisted repository", async () => {
    const store = createMemoryStore();
    const { id, capability } = await startWithCapability(intake, { store, adapter: realFixtureAdapter() });
    const api = fakeGitHub();

    const result = await approveAndPublishEngagement(id, capability, {
      store,
      githubApi: api,
      allowedRepositories,
    });

    expect(result.ok).toBe(true);
    expect(result.issueUrl).toBe("https://github.com/acme/retry-service/issues/7");
    expect(api.calls).toHaveLength(1);
    expect((await store.getEngagement(id))?.status).toBe("completed");
  });

  it("blocks fixture-generated reports from publication", async () => {
    const store = createMemoryStore();
    const { id, capability } = await startWithCapability(intake, { store, adapter: createFixtureAdapter() });
    const api = fakeGitHub();

    const result = await approveAndPublishEngagement(id, capability, {
      store,
      githubApi: api,
      allowedRepositories,
    });

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/fixture/i);
    expect(api.calls).toHaveLength(0);
  });

  it("rejects an invalid publication capability", async () => {
    const store = createMemoryStore();
    const { id, capability } = await startWithCapability(intake, { store, adapter: realFixtureAdapter() });
    const api = fakeGitHub();

    const result = await approveAndPublishEngagement(id, "wrong-capability", {
      store,
      githubApi: api,
      allowedRepositories,
    });

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/capability/i);
    expect(api.calls).toHaveLength(0);
  });

  it("rejects repositories outside the server allowlist", async () => {
    const store = createMemoryStore();
    const { id, capability } = await startWithCapability(intake, { store, adapter: realFixtureAdapter() });
    const api = fakeGitHub();

    const result = await approveAndPublishEngagement(id, capability, {
      store,
      githubApi: api,
      allowedRepositories: ["other/repo"],
    });

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/allowlist/i);
    expect(api.calls).toHaveLength(0);
  });

  it("permits only one external call for concurrent or replayed approvals", async () => {
    const store = createMemoryStore();
    const { id, capability } = await startWithCapability(intake, { store, adapter: realFixtureAdapter() });
    const token = capability;
    const api = fakeGitHub(10);
    const deps = { store, githubApi: api, allowedRepositories };

    const results = await Promise.all([
      approveAndPublishEngagement(id, token, deps),
      approveAndPublishEngagement(id, token, deps),
    ]);
    const replay = await approveAndPublishEngagement(id, token, deps);

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(replay.ok).toBe(false);
    expect(api.calls).toHaveLength(1);
  });

  it("marks publication uncertain when GitHub succeeds but local persistence fails", async () => {
    const base = createMemoryStore();
    const { id, capability } = await startWithCapability(intake, { store: base, adapter: realFixtureAdapter() });
    const store: EngagementStore = {
      ...base,
      async addArtifact(input) {
        if (input.type === "github_issue") throw new Error("persistence unavailable");
        return base.addArtifact(input);
      },
    };

    const result = await approveAndPublishEngagement(id, capability, {
      store,
      githubApi: fakeGitHub(),
      allowedRepositories,
    });

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/publication uncertain/i);
    expect((await store.getEngagement(id))?.status).toBe("publication_uncertain");
  });

  it("keeps the capability out of public component props and server-action arguments", () => {
    const root = process.cwd();
    const page = readFileSync(`${root}/app/runs/[id]/page.tsx`, "utf8");
    const component = readFileSync(`${root}/components/publication/approve-publication.tsx`, "utf8");
    const action = readFileSync(`${root}/app/actions.ts`, "utf8");
    expect(page).not.toContain("engagement.publicationCapability");
    expect(component).not.toContain("publicationCapability");
    expect(action).toContain("httpOnly: true");
    expect(action).toContain('sameSite: "strict"');
    expect(action).toContain("cookies()");
  });
});
