import { calculateScorePercent, formatScore } from '../../state';
import type { AssessmentLearnerResultContract } from '../../types';

export function LearnerResultScoreCard({ result }: { result: AssessmentLearnerResultContract }) {
  const percent = calculateScorePercent({ score: result.score, maxScore: result.maxScore });
  return (
    <section className="rounded-3xl border border-portal-border bg-white p-5" data-testid="learner-result-score-card">
      <p className="text-sm text-portal-text-muted">Score</p>
      <p className="mt-2 text-3xl font-semibold text-portal-text">{formatScore({ score: result.score, maxScore: result.maxScore })}</p>
      {percent !== undefined ? <p className="mt-2 text-sm text-portal-text-muted">{percent}%</p> : null}
      <dl className="mt-4 grid gap-2 text-sm text-portal-text-muted">
        <div><dt className="font-medium text-portal-text">Submitted</dt><dd>{result.submittedAt ?? 'Not available'}</dd></div>
        <div><dt className="font-medium text-portal-text">Released</dt><dd>{result.releasedAt ?? 'Not released'}</dd></div>
      </dl>
    </section>
  );
}
