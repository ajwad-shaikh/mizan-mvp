import "server-only";

import { fixtureResponse } from "./fixtures";

/** A single model call request. Prompts contain only relevant handoff data. */
export type ModelRequest = {
  agentName: string;
  system: string;
  prompt: string;
};

/** The raw, still-unvalidated response returned by any model adapter. */
export type RawModelResponse = {
  content: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
};

/** All model access flows through this single injectable seam. */
export interface ModelAdapter {
  readonly mode: ModelMode;
  complete(request: ModelRequest): Promise<RawModelResponse>;
}

function approxTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

/**
 * Deterministic adapter used by tests and the offline demo. It returns the same
 * raw-response shape as the real provider so both paths flow through the
 * identical Zod-validate + trace code. Per-agent call counts let it demonstrate
 * the reviewer revision loop deterministically.
 */
export function createFixtureAdapter(): ModelAdapter {
  const callCounts = new Map<string, number>();
  return {
    mode: "fixture",
    async complete(request: ModelRequest): Promise<RawModelResponse> {
      const index = callCounts.get(request.agentName) ?? 0;
      callCounts.set(request.agentName, index + 1);
      const content = fixtureResponse(request.agentName, index, request.prompt);
      return {
        content,
        model: "fixture-model",
        inputTokens: approxTokens(request.system + request.prompt),
        outputTokens: approxTokens(content),
      };
    },
  };
}

type ChatCompletion = {
  model?: string;
  choices?: Array<{ message?: { content?: string | null } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
};

export type OpenAIControls = { timeoutMs: number; maxOutputTokens: number };

export function parseOpenAIControls(env: Record<string, string | undefined>): OpenAIControls {
  const timeout = Number(env.MIZAN_MODEL_TIMEOUT_MS);
  const tokens = Number(env.MIZAN_MODEL_MAX_OUTPUT_TOKENS);
  return {
    timeoutMs: Number.isInteger(timeout) && timeout >= 1_000 && timeout <= 120_000 ? timeout : 30_000,
    maxOutputTokens: Number.isInteger(tokens) && tokens >= 128 && tokens <= 16_000 ? tokens : 4_000,
  };
}

/**
 * Real OpenAI-compatible provider. Reads configuration from server-only
 * environment variables and requests strict JSON output. Secrets never leave
 * the server.
 */
export function createOpenAIAdapter(): ModelAdapter {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
  const model = process.env.MIZAN_MODEL ?? "gpt-4o-mini";
  const controls = parseOpenAIControls(process.env);
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set. Set MIZAN_MODEL_MODE=fixture for offline use or provide credentials.",
    );
  }

  return {
    mode: "openai",
    async complete(request: ModelRequest): Promise<RawModelResponse> {
      const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0,
          max_tokens: controls.maxOutputTokens,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: request.system },
            { role: "user", content: request.prompt },
          ],
        }),
        signal: AbortSignal.timeout(controls.timeoutMs),
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new Error(`Model provider error ${response.status}: ${detail.slice(0, 500)}`);
      }

      const json = (await response.json()) as ChatCompletion;
      const content = json.choices?.[0]?.message?.content ?? "";
      return {
        content,
        model: json.model ?? model,
        inputTokens: json.usage?.prompt_tokens ?? approxTokens(request.system + request.prompt),
        outputTokens: json.usage?.completion_tokens ?? approxTokens(content),
      };
    },
  };
}

export type ModelMode = "fixture" | "openai";

export function resolveModelMode(): ModelMode {
  return process.env.MIZAN_MODEL_MODE === "openai" ? "openai" : "fixture";
}

/** Build the adapter selected by MIZAN_MODEL_MODE (defaults to fixture). */
export function createModelAdapter(): ModelAdapter {
  return resolveModelMode() === "openai" ? createOpenAIAdapter() : createFixtureAdapter();
}
