import type { ModelAdapter } from "@/lib/ai/client";
import { runStructured, type StructuredResult } from "@/lib/ai/structured-output";
import { QualityReviewSchema } from "./schemas";
import type { QualityReview } from "./types";
import { QUALITY_REVIEWER_SYSTEM, buildQualityReviewerPrompt, type QualityReviewerInput } from "./prompts";

export const QUALITY_REVIEWER_AGENT_NAME = "quality_reviewer";

export function runQualityReviewer(
  adapter: ModelAdapter,
  input: QualityReviewerInput,
): Promise<StructuredResult<QualityReview>> {
  return runStructured({
    adapter,
    agentName: QUALITY_REVIEWER_AGENT_NAME,
    system: QUALITY_REVIEWER_SYSTEM,
    prompt: buildQualityReviewerPrompt(input),
    schema: QualityReviewSchema,
  });
}
