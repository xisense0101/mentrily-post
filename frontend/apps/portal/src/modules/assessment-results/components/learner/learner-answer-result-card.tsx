import type { AssessmentAnswerResultContract } from '../../types';

export function LearnerAnswerResultCard({ answer }: { answer: AssessmentAnswerResultContract }) {
  return (
    <article className="rounded-3xl border border-portal-border bg-white p-5" data-testid="learner-answer-result-card">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-portal-text">{answer.questionKind}</h3>
          <p className="text-xs text-portal-text-muted">Question {answer.questionId}</p>
        </div>
        <p className="text-sm text-portal-text-muted">{answer.score ?? '—'} / {answer.maxScore ?? '—'}</p>
      </div>
      <p className="mt-3 text-xs text-portal-text-muted">Answer status: {answer.answerStatus}</p>
      {answer.feedback ? <pre className="mt-3 overflow-x-auto rounded-2xl bg-portal-surface-muted p-3 text-xs text-portal-text">{JSON.stringify(answer.feedback, null, 2)}</pre> : <p className="mt-3 text-sm text-portal-text-muted">No feedback released.</p>}
    </article>
  );
}
