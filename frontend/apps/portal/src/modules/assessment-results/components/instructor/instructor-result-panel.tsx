import { formatScore } from '../../state';
import type { AssessmentInstructorResultContract } from '../../types';
import { InstructorResultActions } from './instructor-result-actions';
import { CodingResultSummary } from '../shared';

export function InstructorResultPanel({
  result,
  releasing,
  onRelease,
}: {
  result: AssessmentInstructorResultContract;
  releasing: boolean;
  onRelease: () => Promise<void> | void;
}) {
  return (
    <div className="space-y-4" data-testid="instructor-result-panel">
      <section className="rounded-3xl border border-portal-border bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-portal-text">Result release review</h2>
            <p className="mt-1 text-sm text-portal-text-muted">
              Score: {formatScore({ score: result.score, maxScore: result.maxScore })}
            </p>
            <p className="mt-1 text-sm text-portal-text-muted">
              Grading status: {result.gradingStatus}
            </p>
            <p className="mt-1 text-sm text-portal-text-muted">
              Grading run: {result.gradingRunId ?? 'Not available'}
            </p>
          </div>
          <InstructorResultActions result={result} releasing={releasing} onRelease={onRelease} />
        </div>
      </section>
      <section className="rounded-3xl border border-portal-border bg-white p-5">
        <h3 className="text-base font-semibold text-portal-text">Answer details</h3>
        <ul className="mt-3 space-y-3">
          {result.answers.map((answer) => (
            <li className="rounded-2xl border border-portal-border p-4" key={answer.answerId}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-portal-text">{answer.questionKind}</p>
                  <p className="text-xs text-portal-text-muted">{answer.questionId}</p>
                </div>
                <p className="text-sm text-portal-text-muted">
                  {answer.score ?? '—'} / {answer.maxScore ?? '—'}
                </p>
              </div>

              {/* Learner answer — rendered as preformatted text; sourceCode displayed for CODE questions */}
              {answer.questionKind === 'CODE' ? (
                <div className="mt-3">
                  {typeof answer.learnerAnswer?.sourceCode === 'string' && (
                    <div>
                      <p className="mb-1 text-xs font-medium text-portal-text-muted">
                        Submitted code
                      </p>
                      <pre
                        className="max-h-64 overflow-y-auto whitespace-pre-wrap break-all rounded-xl bg-portal-surface-muted p-3 text-xs text-portal-text"
                        data-testid="instructor-submitted-code"
                      >
                        {answer.learnerAnswer.sourceCode as string}
                      </pre>
                    </div>
                  )}
                  {/* Coding result summary — safe, allowlisted display */}
                  {answer.codingResult ? (
                    <div className="mt-3">
                      <CodingResultSummary result={answer.codingResult} />
                    </div>
                  ) : (
                    <p
                      className="mt-3 text-sm text-portal-text-muted"
                      data-testid="instructor-no-coding-result"
                    >
                      Coding result not available.
                    </p>
                  )}
                </div>
              ) : (
                /* Non-CODE: render learner answer as formatted text, feedback as safe message */
                <div>
                  <pre
                    className="mt-3 overflow-x-auto rounded-2xl bg-portal-surface-muted p-3 text-xs text-portal-text"
                    data-testid="instructor-learner-answer"
                  >
                    {JSON.stringify(answer.learnerAnswer, null, 2)}
                  </pre>
                  {/* Non-CODE feedback: safe message field only, never raw JSON */}
                  {answer.feedback &&
                  typeof answer.feedback === 'object' &&
                  typeof (answer.feedback as Record<string, unknown>).message === 'string' ? (
                    <p
                      className="mt-3 text-sm text-portal-text-muted"
                      data-testid="instructor-feedback-message"
                    >
                      {(answer.feedback as Record<string, unknown>).message as string}
                    </p>
                  ) : answer.feedback ? (
                    <p
                      className="mt-3 text-sm text-portal-text-muted"
                      data-testid="instructor-feedback-available"
                    >
                      Feedback available.
                    </p>
                  ) : null}
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
