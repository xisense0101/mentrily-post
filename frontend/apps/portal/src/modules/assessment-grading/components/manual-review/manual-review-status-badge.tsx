import type { AssessmentAnswerGradeStatusContract } from '../../types';

export function ManualReviewStatusBadge({
  status,
}: {
  status: AssessmentAnswerGradeStatusContract;
}) {
  return (
    <span
      className="rounded-full border border-portal-border px-2 py-1 text-xs"
      data-testid="manual-review-status-badge"
    >
      {status.replaceAll('_', ' ')}
    </span>
  );
}
