import type { AssessmentManualReviewItemContract } from '../../types';
import { ManualReviewItemCard } from './manual-review-item-card';

export function ManualReviewList({ items }: { items: AssessmentManualReviewItemContract[] }) {
  return (
    <div className="grid gap-4" data-testid="manual-review-list">
      {items.map((item) => (
        <ManualReviewItemCard key={item.answerGradeId} item={item} />
      ))}
    </div>
  );
}
