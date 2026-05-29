import type { AssessmentAnswerResultContract } from '../../types';
import { CodingResultSummary } from '../shared';

export function LearnerAnswerResultCard({ answer }: { answer: AssessmentAnswerResultContract }) {
  return (
    <article
      className="rounded-3xl border border-portal-border bg-white p-5"
      data-testid="learner-answer-result-card"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-portal-text">{answer.questionKind}</h3>
          <p className="text-xs text-portal-text-muted">Question {answer.questionId}</p>
        </div>
        <p className="text-sm text-portal-text-muted">
          {answer.score ?? '—'} / {answer.maxScore ?? '—'}
        </p>
      </div>
      <p className="mt-3 text-xs text-portal-text-muted">Answer status: {answer.answerStatus}</p>

      {/* CODE questions: use dedicated safe coding result summary — never raw feedback JSON */}
      {answer.questionKind === 'CODE' ? (
        <div className="mt-3">
          {answer.codingResult ? (
            <CodingResultSummary result={answer.codingResult} showOfficialNotice />
          ) : (
            <p className="text-sm text-portal-text-muted" data-testid="coding-result-not-available">
              Coding result not available.
            </p>
          )}
        </div>
      ) : (
        /* Non-CODE questions: safe text feedback message only, never raw JSON */
        <div className="mt-3">
          {answer.feedback &&
          typeof answer.feedback === 'object' &&
          typeof (answer.feedback as Record<string, unknown>).message === 'string' ? (
            <p className="text-sm text-portal-text-muted" data-testid="learner-feedback-message">
              {(answer.feedback as Record<string, unknown>).message as string}
            </p>
          ) : answer.feedback ? (
            <p className="text-sm text-portal-text-muted" data-testid="learner-feedback-available">
              Feedback available.
            </p>
          ) : (
            <p className="text-sm text-portal-text-muted" data-testid="learner-no-feedback">
              No feedback released.
            </p>
          )}
        </div>
      )}
    </article>
  );
}
