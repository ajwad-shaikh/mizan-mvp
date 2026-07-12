"use client";

import { useState, useTransition } from "react";
import { approvePublicationAction } from "@/app/actions";

export function ApprovePublication({
  engagementId,
}: {
  engagementId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onApprove = () => {
    setError(null);
    startTransition(async () => {
      const result = await approvePublicationAction(engagementId);
      if (!result.ok && result.error) setError(result.error);
      // On success, the server action revalidates the page and the published
      // state renders in place.
    });
  };

  return (
    <section className="space-y-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-5">
      <h2 className="text-lg font-medium text-amber-100">Manual approval required</h2>
      <p className="text-sm text-amber-200/80">
        The Quality Reviewer approved this report. Approve publication to create a real GitHub issue in
        the target repository. This is a real, outward action.
      </p>
      <button
        onClick={onApprove}
        disabled={pending}
        className="rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-black disabled:opacity-60"
      >
        {pending ? "Publishing…" : "Approve & publish to GitHub"}
      </button>
      {error && (
        <div className="rounded-md bg-red-500/10 p-3 text-sm text-red-300">
          <div className="font-semibold">Publication did not complete</div>
          <p>{error}</p>
        </div>
      )}
    </section>
  );
}
