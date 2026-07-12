import type { z } from "zod";
import type { ModelAdapter } from "./client";
import { estimateCostUsd } from "./pricing";

export class StructuredOutputError extends Error {
  agentName: string;
  rawResponses: string[];
  validationMessage: string;

  constructor(agentName: string, rawResponses: string[], validationMessage: string) {
    super(`Structured output for '${agentName}' failed validation after retry: ${validationMessage}`);
    this.name = "StructuredOutputError";
    this.agentName = agentName;
    this.rawResponses = rawResponses;
    this.validationMessage = validationMessage;
  }
}

export type StructuredResult<T> = {
  data: T;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  estimatedCostUsd: number;
  attempts: number;
  /** Raw model outputs from every attempt, preserved for the trace. */
  rawResponses: string[];
};

export type RunStructuredArgs<S extends z.ZodTypeAny> = {
  adapter: ModelAdapter;
  agentName: string;
  system: string;
  prompt: string;
  schema: S;
};

function tryParse<S extends z.ZodTypeAny>(
  schema: S,
  content: string,
): { ok: true; data: z.output<S> } | { ok: false; error: string } {
  let json: unknown;
  try {
    json = JSON.parse(content);
  } catch {
    return { ok: false, error: "Response was not valid JSON." };
  }
  const result = schema.safeParse(json);
  if (result.success) return { ok: true, data: result.data as z.output<S> };
  return { ok: false, error: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
}

/**
 * Run a single validated model call. Validates output against the schema,
 * retries exactly once with the validation error fed back into the prompt, and
 * never silently accepts malformed output. Returns parsed data plus full trace
 * metadata (model, tokens, latency, estimated cost, raw responses).
 */
export async function runStructured<S extends z.ZodTypeAny>(
  args: RunStructuredArgs<S>,
): Promise<StructuredResult<z.output<S>>> {
  const { adapter, agentName, system, schema } = args;
  const start = Date.now();

  const rawResponses: string[] = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let lastModel = "unknown";
  let lastError = "unknown validation error";

  const maxAttempts = 2;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const prompt =
      attempt === 1
        ? args.prompt
        : `${args.prompt}\n\nYour previous response failed validation with these errors:\n${lastError}\nReturn corrected JSON that satisfies the schema. Respond with JSON only.`;

    const raw = await adapter.complete({ agentName, system, prompt });
    rawResponses.push(raw.content);
    totalInputTokens += raw.inputTokens;
    totalOutputTokens += raw.outputTokens;
    lastModel = raw.model;

    const parsed = tryParse(schema, raw.content);
    if (parsed.ok) {
      return {
        data: parsed.data,
        model: lastModel,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        latencyMs: Date.now() - start,
        estimatedCostUsd: estimateCostUsd(lastModel, totalInputTokens, totalOutputTokens),
        attempts: attempt,
        rawResponses,
      };
    }
    lastError = parsed.error;
  }

  throw new StructuredOutputError(agentName, rawResponses, lastError);
}
