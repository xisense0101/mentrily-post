import { getResultStatusLabel } from '../../state';
import type { AssessmentLearnerResultContract } from '../../types';

export function LearnerResultStatusBadge({ result }: { result: AssessmentLearnerResultContract }) {
  return <span className="rounded-full border border-portal-border px-3 py-1 text-xs font-semibold" data-testid="learner-result-status-badge">{getResultStatusLabel({ gradingStatus: result.gradingStatus, releasedAt: result.releasedAt })}</span>;
}
