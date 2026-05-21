'use client';

import { useCallback, useEffect, useState } from 'react';
import { assessmentGradingApiClient } from '../api';
import type { AssessmentGradingRunContract, ManualGradeAssessmentAnswerRequest } from '../types';

export function useGradingRun(gradingRunId: string) {
  const [gradingRun, setGradingRun] = useState<AssessmentGradingRunContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setGradingRun(await assessmentGradingApiClient.getAssessmentGradingRun(gradingRunId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to load grading run.');
    } finally {
      setLoading(false);
    }
  }, [gradingRunId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const manualGradeAnswer = useCallback(async (answerId: string, input: ManualGradeAssessmentAnswerRequest) => {
    setSubmitting(true);
    setError(null);
    try {
      const updated = await assessmentGradingApiClient.manualGradeAssessmentAnswer(gradingRunId, answerId, input);
      setGradingRun(updated);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to submit manual grade.');
      throw cause;
    } finally {
      setSubmitting(false);
    }
  }, [gradingRunId]);

  return { gradingRun, loading, submitting, error, refresh, manualGradeAnswer };
}
