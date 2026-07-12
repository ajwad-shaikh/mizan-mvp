import { z } from "zod";

export type RepoRef = { owner: string; repo: string };

/**
 * Parse a public GitHub repository URL into owner/repo. Returns null for any
 * non-GitHub host or a URL that does not contain both an owner and a repo.
 */
export function parseGitHubRepoUrl(url: string): RepoRef | null {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }
  const host = parsed.hostname.toLowerCase();
  if (host !== "github.com" && host !== "www.github.com") return null;

  const segments = parsed.pathname.split("/").filter(Boolean);
  if (segments.length < 2) return null;

  const owner = segments[0];
  const repo = segments[1].replace(/\.git$/i, "");
  if (!owner || !repo) return null;

  return { owner, repo };
}

export const StrictnessSchema = z.enum(["low", "medium", "high"]);

export const MAX_TITLE_CHARS = 200;
export const MAX_OBJECTIVE_CHARS = 10_000;
export const MAX_CONVERSATION_CHARS = 100_000;
export const MAX_EXPECTED_OUTCOME_CHARS = 10_000;
export const MAX_REPOSITORY_URL_CHARS = 2_048;
/** Conservative floor for the minimum manager/audit/report/review model run. */
export const MINIMUM_RUN_BUDGET_USD = 0.01;
export const MAX_REQUESTED_BUDGET_USD = 100;

export const EngagementIntakeSchema = z.object({
  title: z.string().trim().min(1, "Engagement title is required").max(MAX_TITLE_CHARS),
  taskObjective: z.string().trim().min(1, "Task objective is required").max(MAX_OBJECTIVE_CHARS),
  conversation: z.string().trim().min(1, "An AI conversation is required").max(MAX_CONVERSATION_CHARS),
  repositoryUrl: z
    .string()
    .trim()
    .max(MAX_REPOSITORY_URL_CHARS)
    .refine((v) => parseGitHubRepoUrl(v) !== null, {
      message: "Must be a public GitHub repository URL (https://github.com/owner/repo)",
    }),
  expectedOutcome: z.string().trim().max(MAX_EXPECTED_OUTCOME_CHARS).optional(),
  strictness: StrictnessSchema,
  maxBudgetUsd: z
    .number()
    .finite("Maximum budget must be finite")
    .min(
      MINIMUM_RUN_BUDGET_USD,
      `Maximum budget must be at least $${MINIMUM_RUN_BUDGET_USD.toFixed(2)} to cover the minimum run estimate`,
    )
    .max(MAX_REQUESTED_BUDGET_USD, `Maximum budget cannot exceed $${MAX_REQUESTED_BUDGET_USD}`),
  approvalRequired: z.boolean(),
  outputType: z.literal("github_issue").default("github_issue"),
});

export type EngagementIntake = z.infer<typeof EngagementIntakeSchema>;
export type EngagementIntakeInput = z.input<typeof EngagementIntakeSchema>;
export type Strictness = z.infer<typeof StrictnessSchema>;
