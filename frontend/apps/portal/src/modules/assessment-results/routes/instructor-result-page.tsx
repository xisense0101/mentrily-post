'use client';

import { InstructorResultPanel } from '../components/instructor';
import { ResultErrorState, ResultPageHeader } from '../components/shared';
import { useInstructorAssessmentResult } from '../hooks';

export function InstructorResultPage({ attemptId }: { attemptId: string }) {
  const { result, loading, releasing, error, refresh, releaseResult } = useInstructorAssessmentResult(attemptId);

  return (
    <div className="portal-page space-y-6" data-testid="instructor-result-page">
      <ResultPageHeader title="Result release" description="Release graded assessment results and let learners review their scores." />
      {loading ? <div>Loading result...</div> : null}
      {!loading && error ? <ResultErrorState message={error} onRetry={() => void refresh()} /> : null}
      {!loading && !error && result ? <InstructorResultPanel result={result} releasing={releasing} onRelease={releaseResult} /> : null}
    </div>
  );
}
