'use client';

import { LearnerResultPanel } from '../components/learner';
import { ResultErrorState, ResultPageHeader } from '../components/shared';
import { useLearnerAssessmentResult } from '../hooks';

export function LearnerResultPage({ attemptId }: { attemptId: string }) {
  const { result, loading, error, refresh } = useLearnerAssessmentResult(attemptId);

  return (
    <div className="portal-page space-y-6" data-testid="learner-result-page">
      <ResultPageHeader title="Assessment result" description="Released learner-safe scores and feedback only." />
      {loading ? <div>Loading result...</div> : null}
      {!loading && error ? <ResultErrorState message={error} onRetry={() => void refresh()} /> : null}
      {!loading && !error && result ? <LearnerResultPanel result={result} /> : null}
    </div>
  );
}
