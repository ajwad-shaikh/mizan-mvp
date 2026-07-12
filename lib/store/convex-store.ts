import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
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

export interface ConvexClientLike {
  mutation(reference: string, args: unknown): Promise<unknown>;
  query(reference: string, args: unknown): Promise<unknown>;
}

type ConvexDocument = Record<string, unknown> & { _id: string; _creationTime?: number };

/** Create the production HTTP adapter without depending on generated Convex API files. */
export function createConvexHttpClient(url: string): ConvexClientLike {
  const client = new ConvexHttpClient(url);
  return {
    mutation(reference, args) {
      return client.mutation(makeFunctionReference<"mutation">(reference), args as Record<string, unknown>);
    },
    query(reference, args) {
      return client.query(makeFunctionReference<"query">(reference), args as Record<string, unknown>);
    },
  };
}

/** EngagementStore backed by a real Convex deployment. */
export function createConvexStore(client: ConvexClientLike, serverSecret: string): EngagementStore {
  if (!serverSecret) throw new Error("MIZAN_CONVEX_SERVER_SECRET is required for Convex access.");
  const secure = (args: Record<string, unknown>) => ({ ...args, serverSecret });

  return {
    async createEngagement(input: CreateEngagementInput): Promise<Engagement> {
      const id = String(await client.mutation("engagements:create", secure(omitUndefined(input))));
      const value = await client.query("engagements:get", secure({ id }));
      return mapEngagement(requireDocument(value, "Created engagement was not found."));
    },

    async getEngagement(id: string): Promise<Engagement | null> {
      const value = await client.query("engagements:get", secure({ id }));
      return value ? mapEngagement(requireDocument(value, "Invalid engagement response.")) : null;
    },

    async listEngagements(): Promise<Engagement[]> {
      const values = await client.query("engagements:list", secure({}));
      return requireDocuments(values, "Invalid engagement list.").map(mapEngagement);
    },

    async updateEngagement(id: string, patch: Partial<Engagement>): Promise<Engagement> {
      const { id: _id, ...fields } = patch;
      const value = await client.mutation("engagements:update", secure({
        id,
        patch: omitUndefined(fields),
        clearFields: undefinedFields(fields),
      }));
      return mapEngagement(requireDocument(value, "Updated engagement was not found."));
    },

    async claimEngagementStatus(id, expectedStatus, nextStatus, patch = {}) {
      const { id: _id, ...fields } = patch;
      const value = await client.mutation("engagements:claimStatus", secure({
        id,
        expectedStatus,
        nextStatus,
        patch: omitUndefined(fields),
        clearFields: undefinedFields(fields),
      }));
      return value ? mapEngagement(requireDocument(value, "Invalid claimed engagement response.")) : null;
    },

    async addPlan(input: AddPlanInput): Promise<StoredPlan> {
      const id = String(await client.mutation("plans:add", secure(omitUndefined(input))));
      const value = await client.query("plans:getForEngagement", secure({ engagementId: input.engagementId }));
      const plan = mapDocument<StoredPlan>(requireDocument(value, "Created plan was not found."));
      if (plan.id !== id) throw new Error("Convex returned an unexpected plan.");
      return plan;
    },

    async getPlan(engagementId: string): Promise<StoredPlan | null> {
      const value = await client.query("plans:getForEngagement", secure({ engagementId }));
      return value ? mapDocument<StoredPlan>(requireDocument(value, "Invalid plan response.")) : null;
    },

    async addAgentStep(input: AddAgentStepInput): Promise<AgentStep> {
      const id = String(await client.mutation("agentSteps:record", secure(omitUndefined(input))));
      const steps = await this.listAgentSteps(input.engagementId);
      const step = steps.find((candidate) => candidate.id === id);
      if (!step) throw new Error("Created agent step was not found.");
      return step;
    },

    async listAgentSteps(engagementId: string): Promise<AgentStep[]> {
      const values = await client.query("agentSteps:listForEngagement", secure({ engagementId }));
      return requireDocuments(values, "Invalid agent step list.").map((value) => mapDocument<AgentStep>(value));
    },

    async addArtifact(input: AddArtifactInput): Promise<Artifact> {
      const id = String(await client.mutation("artifacts:add", secure(omitUndefined(input))));
      const artifacts = await this.listArtifacts(input.engagementId);
      const artifact = artifacts.find((candidate) => candidate.id === id);
      if (!artifact) throw new Error("Created artifact was not found.");
      return artifact;
    },

    async listArtifacts(engagementId: string): Promise<Artifact[]> {
      const values = await client.query("artifacts:listForEngagement", secure({ engagementId }));
      return requireDocuments(values, "Invalid artifact list.").map((value) => mapDocument<Artifact>(value));
    },
  };
}

function mapEngagement(value: ConvexDocument): Engagement {
  return mapDocument<Engagement>(value);
}

function mapDocument<T>(value: ConvexDocument): T {
  const { _id, _creationTime: _ignored, ...fields } = value;
  return { id: String(_id), ...fields } as T;
}

function requireDocument(value: unknown, message: string): ConvexDocument {
  if (!value || typeof value !== "object" || !("_id" in value)) throw new Error(message);
  return value as ConvexDocument;
}

function requireDocuments(value: unknown, message: string): ConvexDocument[] {
  if (!Array.isArray(value)) throw new Error(message);
  return value.map((item) => requireDocument(item, message));
}

function omitUndefined<T extends object>(value: T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([, field]) => field !== undefined));
}

function undefinedFields<T extends object>(value: T): string[] {
  return Object.entries(value).filter(([, field]) => field === undefined).map(([key]) => key);
}
