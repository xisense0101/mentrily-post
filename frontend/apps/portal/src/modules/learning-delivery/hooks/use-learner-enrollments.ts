'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  EnrollInLearningCourseRequest,
  LearningEnrollmentContract,
} from '../types';
import type { LearningApiError } from '../api';
import { learningApiClient } from '../api';

type LearnerLearningApi = Pick<
  typeof learningApiClient,
  'completeLearningEnrollment' | 'enrollInLearningCourse' | 'listLearnerEnrollments'
>;

export function useLearnerEnrollments(apiClient: LearnerLearningApi = learningApiClient) {
  const [enrollments, setEnrollments] = useState<LearningEnrollmentContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await apiClient.listLearnerEnrollments();
      setEnrollments(next);
      setError(null);
    } catch (cause) {
      const apiError = cause as LearningApiError;
      setError(apiError.message);
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  const enrollCourse = useCallback(
    async (
      courseId: string,
      input?: EnrollInLearningCourseRequest,
    ): Promise<LearningEnrollmentContract> => {
      const created = await apiClient.enrollInLearningCourse(courseId, input ?? {});
      setEnrollments((current) => [created, ...current.filter((item) => item.id !== created.id)]);
      return created;
    },
    [apiClient],
  );

  const completeEnrollment = useCallback(
    async (enrollmentId: string): Promise<LearningEnrollmentContract> => {
      const completed = await apiClient.completeLearningEnrollment(enrollmentId);
      setEnrollments((current) =>
        current.map((item) => (item.id === completed.id ? completed : item)),
      );
      return completed;
    },
    [apiClient],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return useMemo(
    () => ({
      completeEnrollment,
      enrollCourse,
      enrollments,
      error,
      loading,
      refresh,
    }),
    [completeEnrollment, enrollCourse, enrollments, error, loading, refresh],
  );
}
