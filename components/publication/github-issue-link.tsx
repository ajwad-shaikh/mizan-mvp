export function GitHubIssueLink({ url, number }: { url: string; number?: number }) {
  return (
    <section className="rounded-lg border border-green-500/30 bg-green-500/10 p-5">
      <h2 className="text-lg font-medium text-green-200">Published to GitHub</h2>
      <p className="mt-1 text-sm text-green-300/80">
        The approved audit was published as a real GitHub issue{typeof number === "number" ? ` (#${number})` : ""}.
      </p>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-block rounded-md bg-green-500/20 px-4 py-2 text-sm font-medium text-green-100 hover:bg-green-500/30"
      >
        Open issue ↗
      </a>
      <p className="mt-2 break-all text-xs text-green-300/70">{url}</p>
    </section>
  );
}
