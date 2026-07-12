export function ImprovedPrompt({ prompt }: { prompt: string }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-white/80">Improved prompt</h3>
      <pre className="overflow-x-auto whitespace-pre-wrap rounded-md border border-border bg-black/30 p-3 font-mono text-xs text-white/90">
        {prompt}
      </pre>
    </div>
  );
}
