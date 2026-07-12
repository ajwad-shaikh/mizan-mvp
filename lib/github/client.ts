import "server-only";

import { z } from "zod";

export type CreateIssueInput = {
  owner: string;
  repo: string;
  title: string;
  body: string;
};

export type CreatedIssue = { number: number; htmlUrl: string };

const GitHubCreatedIssueSchema = z.object({
  number: z.number().int().positive(),
  html_url: z.string().url(),
});

/** Injectable GitHub issue API so the publish path is unit-testable. */
export interface GitHubIssueApi {
  createIssue(input: CreateIssueInput): Promise<CreatedIssue>;
}

/**
 * Real GitHub REST client. The personal access token is read server-side only
 * and is never exposed to the browser.
 */
export function createGitHubClient(token: string): GitHubIssueApi {
  if (!token) {
    throw new Error("GITHUB_TOKEN is not set. A token is required to publish a real GitHub issue.");
  }
  return {
    async createIssue({ owner, repo, title, body }: CreateIssueInput): Promise<CreatedIssue> {
      if (!title.trim() || title.length > 256) throw new Error("GitHub issue title must be 1-256 characters.");
      if (!body.trim() || body.length > 65_536) throw new Error("GitHub issue body must be 1-65536 characters.");
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
        method: "POST",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title, body }),
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new Error(`GitHub issue creation failed (${response.status}): ${detail.slice(0, 500)}`);
      }

      const parsed = GitHubCreatedIssueSchema.safeParse(await response.json());
      if (!parsed.success) {
        throw new Error(`Invalid GitHub issue response: ${parsed.error.message}`);
      }
      const issueUrl = new URL(parsed.data.html_url);
      const expectedPath = `/${owner}/${repo}/issues/${parsed.data.number}`.toLowerCase();
      if (issueUrl.protocol !== "https:" || issueUrl.hostname.toLowerCase() !== "github.com" || issueUrl.pathname.toLowerCase() !== expectedPath) {
        throw new Error("Invalid GitHub issue response: URL does not match the requested repository and issue number.");
      }
      return { number: parsed.data.number, htmlUrl: parsed.data.html_url };
    },
  };
}

/** Build the real client from the environment, or null when no token is set. */
export function createGitHubClientFromEnv(): GitHubIssueApi | null {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return null;
  return createGitHubClient(token);
}
