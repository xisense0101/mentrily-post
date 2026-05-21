import type { AssessmentGradingRunStatusContract } from '../../types';

export function GradingStatusBadge({ status }: { status: AssessmentGradingRunStatusContract }) {
  return (
    <span
      className="rounded-full border border-portal-border px-2 py-1 text-xs"
      data-testid="grading-status-badge"
    >
      {status.replaceAll('_', ' ')}
    </span>
  );
}
