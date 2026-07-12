import { describe, expect, it } from "vitest";
import { createFixtureAdapter, parseOpenAIControls } from "./client";

describe("fixture adapter", () => {
  it("reflects engagement fields in demo output instead of presenting unrelated canned facts", async () => {
    const adapter = createFixtureAdapter();
    const response = await adapter.complete({
      agentName: "agency_manager",
      system: "json",
      prompt: [
        "Engagement title: Webhook timeout audit",
        "Repository: https://github.com/acme/hooks",
        "Task objective:",
        "Make webhook delivery timeouts explicit.",
        "",
        "AI coding conversation:",
        "User: clarify timeout behavior",
      ].join("\n"),
    });

    expect(response.content).toContain("Webhook timeout audit");
    expect(response.content).toContain("Make webhook delivery timeouts explicit.");
  });
});

describe("OpenAI resource controls", () => {
  it("bounds invalid deployment values to safe defaults", () => {
    expect(parseOpenAIControls({ MIZAN_MODEL_TIMEOUT_MS: "nope", MIZAN_MODEL_MAX_OUTPUT_TOKENS: "999999" }))
      .toEqual({ timeoutMs: 30_000, maxOutputTokens: 4_000 });
  });
});
