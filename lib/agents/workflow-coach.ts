import type { ModelAdapter } from "@/lib/ai/client";
import { runStructured, type StructuredResult } from "@/lib/ai/structured-output";
import { WorkflowRecommendationSchema } from "./schemas";
import type { WorkflowRecommendation } from "./types";
import { WORKFLOW_COACH_SYSTEM, buildWorkflowCoachPrompt, type WorkflowCoachInput } from "./prompts";

export const WORKFLOW_COACH_AGENT_NAME = "workflow_coach";

export function runWorkflowCoach(
  adapter: ModelAdapter,
  input: WorkflowCoachInput,
): Promise<StructuredResult<WorkflowRecommendation>> {
  return runStructured({
    adapter,
    agentName: WORKFLOW_COACH_AGENT_NAME,
    system: WORKFLOW_COACH_SYSTEM,
    prompt: buildWorkflowCoachPrompt(input),
    schema: WorkflowRecommendationSchema,
  });
}
