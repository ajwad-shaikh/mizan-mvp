import type { EngagementIntakeInput } from "./engagements/schema";

/**
 * The "retry implementation" demo engagement. Its conversation is tuned so the
 * fixture model produces a realistic audit, one reviewer revision, and an
 * approvable report.
 */
export const RETRY_SAMPLE: EngagementIntakeInput = {
  title: "Retry implementation audit",
  taskObjective: "Add retry behaviour to the API client for transient failures only.",
  conversation: [
    "User: Add retries to our API client.",
    "Assistant: Done — I wrapped every request in a retry loop with 3 attempts.",
    "User: Wait, it shouldn't retry 4xx responses, only transient errors.",
    "Assistant: Updated to retry only on network errors and 5xx.",
    "User: It also needs capped exponential backoff, not a fixed delay.",
    "Assistant: Added capped exponential backoff (max 3 attempts).",
    "User: Can you add unit tests for both retried and non-retried errors?",
    "Assistant: Added tests covering transient (retried) and permanent (not retried) cases.",
  ].join("\n"),
  repositoryUrl: "https://github.com/octocat/Hello-World",
  expectedOutcome: "A reusable prompt and workflow that gets retry scope right on the first attempt.",
  strictness: "medium",
  maxBudgetUsd: 5,
  approvalRequired: true,
  outputType: "github_issue",
};
