import { describe, it, expect } from "vitest";
import { z } from "zod";
import { runStructured, StructuredOutputError } from "./structured-output";
import type { ModelAdapter, RawModelResponse } from "./client";

const Schema = z.object({ answer: z.string().min(1) });

/** A fake adapter that returns scripted raw responses in order. */
function fakeAdapter(contents: string[]): ModelAdapter & { calls: number } {
  const adapter = {
    mode: "fixture" as const,
    calls: 0,
    async complete(): Promise<RawModelResponse> {
      const content = contents[adapter.calls] ?? contents[contents.length - 1];
      adapter.calls += 1;
      return {
        content,
        model: "fake-model",
        inputTokens: 100,
        outputTokens: 20,
      };
    },
  };
  return adapter;
}

const baseArgs = {
  agentName: "test_agent",
  system: "You are a test agent.",
  prompt: "Return an answer.",
  schema: Schema,
};

describe("runStructured", () => {
  it("returns parsed output with trace metadata for valid output", async () => {
    const adapter = fakeAdapter([JSON.stringify({ answer: "hello" })]);
    const result = await runStructured({ adapter, ...baseArgs });

    expect(result.data.answer).toBe("hello");
    expect(result.model).toBe("fake-model");
    expect(result.inputTokens).toBe(100);
    expect(result.outputTokens).toBe(20);
    expect(result.attempts).toBe(1);
    expect(typeof result.latencyMs).toBe("number");
    expect(result.estimatedCostUsd).toBeGreaterThanOrEqual(0);
    expect(adapter.calls).toBe(1);
  });

  it("retries once with validation feedback and succeeds", async () => {
    const adapter = fakeAdapter([
      JSON.stringify({ answer: "" }), // fails min(1)
      JSON.stringify({ answer: "recovered" }),
    ]);
    const result = await runStructured({ adapter, ...baseArgs });

    expect(result.data.answer).toBe("recovered");
    expect(result.attempts).toBe(2);
    expect(adapter.calls).toBe(2);
    // The raw invalid response is preserved for the trace.
    expect(result.rawResponses[0]).toContain('"answer":""');
  });

  it("throws after two invalid outputs and preserves raw responses", async () => {
    const adapter = fakeAdapter([JSON.stringify({ answer: "" }), "not json at all"]);

    await expect(runStructured({ adapter, ...baseArgs })).rejects.toBeInstanceOf(
      StructuredOutputError,
    );

    try {
      await runStructured({ adapter: fakeAdapter([JSON.stringify({ answer: "" }), "nope"]), ...baseArgs });
    } catch (err) {
      const e = err as StructuredOutputError;
      expect(e.rawResponses).toHaveLength(2);
      expect(e.agentName).toBe("test_agent");
    }
  });
});
