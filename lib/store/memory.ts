import type {
  AddAgentStepInput,
  AddArtifactInput,
  AddPlanInput,
  AgentStep,
  Artifact,
  CreateEngagementInput,
  Engagement,
  EngagementStore,
  StoredPlan,
} from "./types";

type Tables = {
  engagements: Map<string, Engagement>;
  plans: StoredPlan[];
  agentSteps: AgentStep[];
  artifacts: Artifact[];
  counter: number;
};

/**
 * In-memory persistence used when Convex is not configured. It keeps the app
 * fully runnable and testable offline. The real Convex schema/functions under
 * convex/ mirror this shape for deployment.
 */
export function createMemoryStore(): EngagementStore {
  const tables: Tables = {
    engagements: new Map(),
    plans: [],
    agentSteps: [],
    artifacts: [],
    counter: 0,
  };

  const nextId = (prefix: string) => {
    tables.counter += 1;
    return `${prefix}_${Date.now().toString(36)}_${tables.counter}`;
  };

  return {
    async createEngagement(input: CreateEngagementInput): Promise<Engagement> {
      const engagement: Engagement = {
        id: nextId("eng"),
        ...input,
        status: "draft",
        createdAt: Date.now(),
      };
      tables.engagements.set(engagement.id, engagement);
      return engagement;
    },

    async getEngagement(id: string): Promise<Engagement | null> {
      return tables.engagements.get(id) ?? null;
    },

    async listEngagements(): Promise<Engagement[]> {
      return [...tables.engagements.values()].sort((a, b) => b.createdAt - a.createdAt);
    },

    async updateEngagement(id: string, patch: Partial<Engagement>): Promise<Engagement> {
      const existing = tables.engagements.get(id);
      if (!existing) throw new Error(`Engagement ${id} not found`);
      const updated = { ...existing, ...patch, id: existing.id };
      tables.engagements.set(id, updated);
      return updated;
    },

    async claimEngagementStatus(id, expectedStatus, nextStatus, patch = {}) {
      const existing = tables.engagements.get(id);
      if (!existing || existing.status !== expectedStatus) return null;
      const updated = { ...existing, ...patch, id: existing.id, status: nextStatus };
      tables.engagements.set(id, updated);
      return updated;
    },

    async addPlan(input: AddPlanInput): Promise<StoredPlan> {
      const plan: StoredPlan = { id: nextId("plan"), ...input, createdAt: Date.now() };
      tables.plans.push(plan);
      return plan;
    },

    async getPlan(engagementId: string): Promise<StoredPlan | null> {
      return tables.plans.find((p) => p.engagementId === engagementId) ?? null;
    },

    async addAgentStep(input: AddAgentStepInput): Promise<AgentStep> {
      const step: AgentStep = { id: nextId("step"), ...input, createdAt: Date.now() };
      tables.agentSteps.push(step);
      return step;
    },

    async listAgentSteps(engagementId: string): Promise<AgentStep[]> {
      return tables.agentSteps.filter((s) => s.engagementId === engagementId);
    },

    async addArtifact(input: AddArtifactInput): Promise<Artifact> {
      const artifact: Artifact = { id: nextId("art"), ...input, createdAt: Date.now() };
      tables.artifacts.push(artifact);
      return artifact;
    },

    async listArtifacts(engagementId: string): Promise<Artifact[]> {
      return tables.artifacts.filter((a) => a.engagementId === engagementId);
    },
  };
}
