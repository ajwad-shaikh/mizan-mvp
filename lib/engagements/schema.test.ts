import { describe, it, expect } from "vitest";
import {
  EngagementIntakeSchema,
  MAX_CONVERSATION_CHARS,
  MINIMUM_RUN_BUDGET_USD,
  parseGitHubRepoUrl,
} from "./schema";

const valid = {
  title: "Retry implementation audit",
  taskObjective: "Add retries for transient errors only.",
  conversation: "User: add retries\nAssistant: sure...",
  repositoryUrl: "https://github.com/acme/retry-service",
  strictness: "medium",
  maxBudgetUsd: 5,
  approvalRequired: true,
};

describe("EngagementIntakeSchema", () => {
  it("accepts valid input and defaults outputType", () => {
    const parsed = EngagementIntakeSchema.parse(valid);
    expect(parsed.outputType).toBe("github_issue");
  });

  it("rejects an empty objective", () => {
    expect(EngagementIntakeSchema.safeParse({ ...valid, taskObjective: "" }).success).toBe(false);
  });

  it("rejects a non-GitHub repository URL", () => {
    expect(
      EngagementIntakeSchema.safeParse({ ...valid, repositoryUrl: "https://gitlab.com/a/b" }).success,
    ).toBe(false);
  });

  it("rejects a malformed GitHub URL missing the repo", () => {
    expect(
      EngagementIntakeSchema.safeParse({ ...valid, repositoryUrl: "https://github.com/acme" }).success,
    ).toBe(false);
  });

  it("rejects a zero or negative budget", () => {
    expect(EngagementIntakeSchema.safeParse({ ...valid, maxBudgetUsd: 0 }).success).toBe(false);
    expect(EngagementIntakeSchema.safeParse({ ...valid, maxBudgetUsd: -3 }).success).toBe(false);
  });

  it("rejects a conversation larger than the model-input bound", () => {
    const result = EngagementIntakeSchema.safeParse({
      ...valid,
      conversation: "x".repeat(MAX_CONVERSATION_CHARS + 1),
    });
    expect(result.success).toBe(false);
  });

  it("rejects a budget below the conservative minimum run estimate", () => {
    const result = EngagementIntakeSchema.safeParse({
      ...valid,
      maxBudgetUsd: MINIMUM_RUN_BUDGET_USD / 2,
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid strictness", () => {
    expect(EngagementIntakeSchema.safeParse({ ...valid, strictness: "extreme" }).success).toBe(false);
  });
});

describe("parseGitHubRepoUrl", () => {
  it("parses owner and repo", () => {
    expect(parseGitHubRepoUrl("https://github.com/acme/retry-service")).toEqual({
      owner: "acme",
      repo: "retry-service",
    });
  });

  it("tolerates a .git suffix and trailing slash", () => {
    expect(parseGitHubRepoUrl("https://github.com/acme/retry-service.git/")).toEqual({
      owner: "acme",
      repo: "retry-service",
    });
  });

  it("returns null for a non-GitHub host", () => {
    expect(parseGitHubRepoUrl("https://example.com/a/b")).toBeNull();
  });

  it("returns null when the repo segment is missing", () => {
    expect(parseGitHubRepoUrl("https://github.com/acme")).toBeNull();
  });
});
