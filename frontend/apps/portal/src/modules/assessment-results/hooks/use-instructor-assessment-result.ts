'use client';

import { useCallback, useEffect, useState } from 'react';
import { assessmentResultApiClient } from '../api';
import type { AssessmentInstructorResultContract } from '../types';

export function useInstructorAssessmentResult(attemptId: string) {
  const [result, setResult] = useState<AssessmentInstructorResultContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [releasing, setReleasing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setResult(await assessmentResultApiClient.getInstructorAssessmentResult(attemptId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to load instructor result.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [attemptId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const releaseResult = useCallback(async () => {
    setReleasing(true);
    setError(null);
    try {
      const updated = await assessmentResultApiClient.releaseAssessmentResult(attemptId);
      setResult(updated);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to release result.');
      throw cause;
    } finally {
      setReleasing(false);
    }
  }, [attemptId]);

  return { result, loading, releasing, error, refresh, releaseResult };
}
