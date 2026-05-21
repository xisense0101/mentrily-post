'use client';

import { useCallback, useEffect, useState } from 'react';
import { assessmentAttemptApiClient } from '../api';
import type { AssessmentAttemptContract } from '../types';

export function useLearnerAssessmentAttempts() {
  const [attempts, setAttempts] = useState<AssessmentAttemptContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const nextAttempts = await assessmentAttemptApiClient.listLearnerAssessmentAttempts();
      setAttempts(nextAttempts);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to load attempts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    attempts,
    loading,
    error,
    refresh,
  };
}
