import type { EngagementStatus } from "@/lib/store/types";

const LABELS: Record<EngagementStatus, string> = {
  draft: "Draft",
  planning: "Planning",
  running: "Running",
  review: "In review",
  awaiting_approval: "Awaiting approval",
  review_failed: "Review failed",
  publishing: "Publishing",
  publication_uncertain: "Publication uncertain",
  completed: "Completed",
  failed: "Failed",
};

const COLORS: Record<EngagementStatus, string> = {
  draft: "bg-white/10 text-white/70",
  planning: "bg-blue-500/15 text-blue-300",
  running: "bg-blue-500/15 text-blue-300",
  review: "bg-purple-500/15 text-purple-300",
  awaiting_approval: "bg-amber-500/15 text-amber-300",
  review_failed: "bg-red-500/15 text-red-300",
  publishing: "bg-blue-500/15 text-blue-300",
  publication_uncertain: "bg-orange-500/15 text-orange-300",
  completed: "bg-green-500/15 text-green-300",
  failed: "bg-red-500/15 text-red-300",
};

export function StatusBadge({ status }: { status: EngagementStatus }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${COLORS[status]}`}>
      {LABELS[status]}
    </span>
  );
}
