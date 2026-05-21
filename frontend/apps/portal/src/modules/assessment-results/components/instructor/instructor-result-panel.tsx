import { formatScore } from '../../state';
import type { AssessmentInstructorResultContract } from '../../types';
import { InstructorResultActions } from './instructor-result-actions';

export function InstructorResultPanel({ result, releasing, onRelease }: { result: AssessmentInstructorResultContract; releasing: boolean; onRelease: () => Promise<void> | void }) {
  return (
    <div className="space-y-4" data-testid="instructor-result-panel">
      <section className="rounded-3xl border border-portal-border bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-portal-text">Result release review</h2>
            <p className="mt-1 text-sm text-portal-text-muted">Score: {formatScore({ score: result.score, maxScore: result.maxScore })}</p>
            <p className="mt-1 text-sm text-portal-text-muted">Grading status: {result.gradingStatus}</p>
            <p className="mt-1 text-sm text-portal-text-muted">Grading run: {result.gradingRunId ?? 'Not available'}</p>
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
                <p className="text-sm text-portal-text-muted">{answer.score ?? '—'} / {answer.maxScore ?? '—'}</p>
              </div>
              <pre className="mt-3 overflow-x-auto rounded-2xl bg-portal-surface-muted p-3 text-xs text-portal-text">{JSON.stringify(answer.learnerAnswer, null, 2)}</pre>
              {answer.feedback ? <pre className="mt-3 overflow-x-auto rounded-2xl bg-slate-50 p-3 text-xs text-portal-text">{JSON.stringify(answer.feedback, null, 2)}</pre> : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
