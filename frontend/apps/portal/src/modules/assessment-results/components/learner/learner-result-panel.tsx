import type { AssessmentLearnerResultContract } from '../../types';
import { canShowLearnerResult } from '../../state';
import { LearnerAnswerResultCard } from './learner-answer-result-card';
import { LearnerResultEmptyState } from './learner-result-empty-state';
import { LearnerResultScoreCard } from './learner-result-score-card';
import { LearnerResultStatusBadge } from './learner-result-status-badge';

export function LearnerResultPanel({ result }: { result: AssessmentLearnerResultContract }) {
  if (!canShowLearnerResult({ gradingStatus: result.gradingStatus, releasedAt: result.releasedAt })) {
    return <LearnerResultEmptyState />;
  }

  return (
    <div className="space-y-4" data-testid="learner-result-panel">
      <div className="flex items-center justify-between gap-3 rounded-3xl border border-portal-border bg-white p-5">
        <div>
          <h2 className="text-xl font-semibold text-portal-text">Released result</h2>
          <p className="text-sm text-portal-text-muted">Learner-safe score and feedback only.</p>
        </div>
        <LearnerResultStatusBadge result={result} />
      </div>
      <LearnerResultScoreCard result={result} />
      <div className="grid gap-3">
        {result.answers.map((answer) => <LearnerAnswerResultCard key={answer.questionId} answer={answer} />)}
      </div>
    </div>
  );
}
