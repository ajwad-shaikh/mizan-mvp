/**
 * Simple, intentionally approximate model price configuration. Costs are USD
 * per one million tokens. Used only to produce clearly-labelled cost estimates
 * for the trace — never treated as a measured billing figure.
 */
export type ModelPricing = {
  inputUsdPerMillionTokens: number;
  outputUsdPerMillionTokens: number;
};

export const MODEL_PRICING: Record<string, ModelPricing> = {
  "gpt-4o": { inputUsdPerMillionTokens: 2.5, outputUsdPerMillionTokens: 10 },
  "gpt-4o-mini": { inputUsdPerMillionTokens: 0.15, outputUsdPerMillionTokens: 0.6 },
  "fixture-model": { inputUsdPerMillionTokens: 0.15, outputUsdPerMillionTokens: 0.6 },
};

// Fallback pricing for unknown models so cost estimates are never silently zero.
export const DEFAULT_PRICING: ModelPricing = {
  inputUsdPerMillionTokens: 0.5,
  outputUsdPerMillionTokens: 1.5,
};

export function pricingForModel(model: string): ModelPricing {
  return MODEL_PRICING[model] ?? DEFAULT_PRICING;
}

export function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = pricingForModel(model);
  const cost =
    (inputTokens * pricing.inputUsdPerMillionTokens) / 1_000_000 +
    (outputTokens * pricing.outputUsdPerMillionTokens) / 1_000_000;
  // Round to 6 decimal places to keep trace numbers readable.
  return Math.round(cost * 1_000_000) / 1_000_000;
}
