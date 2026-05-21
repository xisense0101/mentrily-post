export function ManualReviewListSkeleton() {
  return (
    <div
      className="rounded-3xl border border-portal-border bg-white p-8 text-sm"
      data-testid="manual-review-list"
    >
      Loading manual review queue...
    </div>
  );
}
