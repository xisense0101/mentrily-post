'use client';

import { ManualReviewEmptyState, ManualReviewList, ManualReviewListSkeleton, ManualReviewPageHeader } from '../components/manual-review';
import { GradingErrorState } from '../components/shared';
import { useManualReviewQueue } from '../hooks';

export function ManualReviewPage() {
  const { items, loading, error, refresh } = useManualReviewQueue();

  return (
    <div className="portal-page space-y-6" data-testid="manual-review-page">
      <ManualReviewPageHeader />
      {loading ? <ManualReviewListSkeleton /> : null}
      {!loading && error ? <GradingErrorState message={error} onRetry={() => void refresh()} /> : null}
      {!loading && !error && items.length === 0 ? <ManualReviewEmptyState /> : null}
      {!loading && !error && items.length > 0 ? <ManualReviewList items={items} /> : null}
    </div>
  );
}
