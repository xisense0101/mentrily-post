import type { AssessmentGradingRunContract } from '../../types';
import { GradingStatusBadge } from './grading-status-badge';

export function GradingRunSummary({ run }: { run: AssessmentGradingRunContract }) {
  return (
    <section
      className="rounded-3xl border border-portal-border bg-white p-5"
      data-testid="grading-run-summary"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Grading run</h2>
        <GradingStatusBadge status={run.status} />
      </div>
      <p className="mt-2 text-sm text-portal-text-muted">
        Total: {run.totalScore ?? 0} / {run.maxScore ?? 0}
      </p>
    </section>
  );
}
