import type { AssessmentManualReviewItemContract } from '../../types';
import { ManualReviewStatusBadge } from './manual-review-status-badge';

export function ManualReviewItemCard({ item }: { item: AssessmentManualReviewItemContract }) {
  return (
    <article
      className="rounded-3xl border border-portal-border bg-white p-5"
      data-testid="manual-review-item-card"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-portal-text">
          {item.assessmentTitle ?? 'Assessment'}
        </h3>
        <ManualReviewStatusBadge status={item.status} />
      </div>
      <p className="mt-2 text-sm text-portal-text-muted">Learner: {item.learnerPrincipalId}</p>
      <p className="mt-1 text-sm text-portal-text-muted">
        Question: {item.questionTitle ?? item.questionKind}
      </p>
      <p className="mt-1 text-sm text-portal-text-muted">Max score: {item.maxScore}</p>
      <a
        className="mt-4 inline-block text-sm font-medium text-sky-700"
        data-testid="manual-review-open-run-link"
        href={`/grading/runs/${item.gradingRunId}`}
      >
        Open grading run
      </a>
    </article>
  );
}
