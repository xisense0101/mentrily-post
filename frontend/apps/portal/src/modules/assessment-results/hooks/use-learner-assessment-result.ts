'use client';

import { useCallback, useEffect, useState } from 'react';
import { assessmentResultApiClient } from '../api';
import type { AssessmentLearnerResultContract } from '../types';

export function useLearnerAssessmentResult(attemptId: string) {
  const [result, setResult] = useState<AssessmentLearnerResultContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setResult(await assessmentResultApiClient.getLearnerAssessmentResult(attemptId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to load result.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [attemptId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { result, loading, error, refresh };
}
