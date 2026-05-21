'use client';

import { AttemptCard, AttemptEmptyState, AttemptListSkeleton } from '../components/attempt';
import { AttemptErrorState, AttemptPageHeader } from '../components/shared';
import { useLearnerAssessmentAttempts } from '../hooks';

export function LearnerAttemptsPage() {
  const { attempts, loading, error, refresh } = useLearnerAssessmentAttempts();

  return (
    <div className="portal-page space-y-8" data-testid="attempts-page">
      <AttemptPageHeader
        eyebrow="Learner attempts"
        title="Your attempts"
        description="Continue quizzes, exams, and assignments you have started."
      />

      {loading ? <AttemptListSkeleton /> : null}
      {!loading && error ? (
        <AttemptErrorState message={error} onRetry={() => void refresh()} />
      ) : null}
      {!loading && !error && attempts.length === 0 ? <AttemptEmptyState /> : null}
      {!loading && !error && attempts.length > 0 ? (
        <div className="grid gap-4">
          {attempts.map((attempt) => (
            <AttemptCard attempt={attempt} key={attempt.id} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
