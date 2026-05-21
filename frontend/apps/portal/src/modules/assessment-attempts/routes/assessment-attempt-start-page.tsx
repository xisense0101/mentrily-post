'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AssessmentAttemptApiError, assessmentAttemptApiClient } from '../api';
import { isAttemptEditable } from '../state';
import { AttemptPageHeader } from '../components/shared';
import { AttemptStartCard, AttemptStartErrorState } from '../components/start';

interface AssessmentAttemptStartPageProps {
  assessmentId: string;
}

export function AssessmentAttemptStartPage({ assessmentId }: AssessmentAttemptStartPageProps) {
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart(): Promise<void> {
    setIsStarting(true);
    setError(null);

    try {
      const attempt = await assessmentAttemptApiClient.startAssessmentAttempt(assessmentId);
      router.push(`/attempts/${attempt.id}`);
    } catch (cause) {
      const attempts = await assessmentAttemptApiClient
        .listLearnerAssessmentAttempts()
        .catch(() => []);
      const existingAttempt = attempts.find(
        (attempt) => attempt.assessmentId === assessmentId && isAttemptEditable(attempt),
      );

      if (existingAttempt) {
        router.push(`/attempts/${existingAttempt.id}`);
        return;
      }

      setError(
        cause instanceof AssessmentAttemptApiError || cause instanceof Error
          ? cause.message
          : 'Unable to start attempt.',
      );
    } finally {
      setIsStarting(false);
    }
  }

  return (
    <div className="portal-page space-y-8">
      <AttemptPageHeader
        eyebrow="Learner attempts"
        title="Start attempt"
        description="Start or resume a learner-owned attempt from the assessment’s published snapshot."
        actions={
          <a
            className="rounded-full border border-portal-border bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm"
            href="/attempts"
          >
            View attempts
          </a>
        }
      />

      <AttemptStartCard
        assessmentId={assessmentId}
        errorMessage={error}
        isStarting={isStarting}
        onStart={handleStart}
      />

      {error ? <AttemptStartErrorState message={error} /> : null}
    </div>
  );
}
