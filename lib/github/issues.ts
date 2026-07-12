import type { RepoRef } from "@/lib/engagements/schema";
import type { ExecutiveReport } from "@/lib/agents/types";
import { renderGitHubIssue } from "@/lib/reports/github-markdown";
import type { GitHubIssueApi } from "./client";

export type PublishResult = { issueNumber: number; issueUrl: string };

export type PublishArgs = {
  api: GitHubIssueApi;
  repo: RepoRef;
  report: ExecutiveReport;
};

/**
 * Render an approved report to Markdown and create a real GitHub issue in the
 * target public repository. Returns the created issue's number and URL.
 */
export async function publishReportAsIssue({ api, repo, report }: PublishArgs): Promise<PublishResult> {
  const { title, body } = renderGitHubIssue(report);
  const created = await api.createIssue({ owner: repo.owner, repo: repo.repo, title, body });
  return { issueNumber: created.number, issueUrl: created.htmlUrl };
}
