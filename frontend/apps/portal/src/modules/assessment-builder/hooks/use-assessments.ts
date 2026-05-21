'use client';

import { useEffect, useState } from 'react';
import type {
  AssessmentContract,
  AssessmentPurposeContract,
  CreateAssessmentRequest,
} from '../types';
import type { assessmentApiClient } from '../api';

type AssessmentsApi = Pick<typeof assessmentApiClient, 'createAssessment' | 'listAssessments'>;

export function useAssessments(apiClient: AssessmentsApi) {
  const [assessments, setAssessments] = useState<AssessmentContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh(input?: { purpose?: AssessmentPurposeContract }) {
    setLoading(true);
    try {
      const nextAssessments = await apiClient.listAssessments(input);
      setAssessments(nextAssessments);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Assessment loading failed.');
    } finally {
      setLoading(false);
    }
  }

  async function createAssessment(input: CreateAssessmentRequest) {
    const created = await apiClient.createAssessment(input);
    setAssessments((current) => [created, ...current.filter((item) => item.id !== created.id)]);
    return created;
  }

  useEffect(() => {
    void refresh();
  }, []);

  return {
    assessments,
    loading,
    error,
    refresh,
    createAssessment,
  };
}
