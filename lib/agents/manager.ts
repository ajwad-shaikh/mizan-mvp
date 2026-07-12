import type { ModelAdapter } from "@/lib/ai/client";
import { runStructured, type StructuredResult } from "@/lib/ai/structured-output";
import { AgencyPlanSchema } from "./schemas";
import type { AgencyPlan } from "./types";
import { MANAGER_SYSTEM, buildManagerPrompt, type ManagerInput } from "./prompts";

export const MANAGER_AGENT_NAME = "agency_manager";

export function runManager(
  adapter: ModelAdapter,
  input: ManagerInput,
): Promise<StructuredResult<AgencyPlan>> {
  return runStructured({
    adapter,
    agentName: MANAGER_AGENT_NAME,
    system: MANAGER_SYSTEM,
    prompt: buildManagerPrompt(input),
    schema: AgencyPlanSchema,
  });
}
