export function ManualReviewEmptyState() {
  return (
    <div
      className="rounded-3xl border border-portal-border bg-white p-8 text-sm text-portal-text-muted"
      data-testid="manual-review-empty-state"
    >
      No answers are waiting for manual review.
    </div>
  );
}
