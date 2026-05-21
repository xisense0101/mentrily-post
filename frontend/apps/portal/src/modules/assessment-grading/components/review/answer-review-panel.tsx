import { formatLearnerAnswer } from '../../state';
import type { AssessmentManualReviewItemContract } from '../../types';

export function AnswerReviewPanel({ item }: { item: AssessmentManualReviewItemContract }) {
  return (
    <div
      className="rounded-2xl border border-portal-border bg-white/70 p-4"
      data-testid="answer-review-panel"
    >
      <p className="text-sm font-semibold">Learner answer</p>
      <pre className="mt-2 whitespace-pre-wrap text-sm" data-testid="learner-answer-panel">
        {formatLearnerAnswer({ questionKind: item.questionKind, answer: item.learnerAnswer })}
      </pre>
    </div>
  );
}
