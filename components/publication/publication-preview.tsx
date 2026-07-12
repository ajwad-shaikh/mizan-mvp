import type { ExecutiveReport } from "@/lib/agents/types";
import { renderGitHubIssue } from "@/lib/reports/github-markdown";

/** Preview the exact Markdown that will be published as the GitHub issue. */
export function PublicationPreview({ report }: { report: ExecutiveReport }) {
  const { title, body } = renderGitHubIssue(report);
  return (
    <details className="rounded-lg border border-border bg-surface/40 p-5">
      <summary className="cursor-pointer text-lg font-medium">GitHub issue preview</summary>
      <div className="mt-3 space-y-2">
        <p className="text-sm text-white/80">
          <span className="text-muted">Title:</span> {title}
        </p>
        <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-black/30 p-3 text-xs text-muted">
          {body}
        </pre>
      </div>
    </details>
  );
}
