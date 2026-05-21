'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  CreateLearningCourseRequest,
  LearningCourseContract,
} from '../types';
import type { LearningApiError } from '../api';
import { learningApiClient } from '../api';

type CreatorLearningApi = Pick<
  typeof learningApiClient,
  'createLearningCourse' | 'listWorkspaceLearningCourses' | 'publishLearningCourse'
>;

export function useCreatorLearningCourses(apiClient: CreatorLearningApi = learningApiClient) {
  const [courses, setCourses] = useState<LearningCourseContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const nextCourses = await apiClient.listWorkspaceLearningCourses();
      setCourses(nextCourses);
      setError(null);
    } catch (cause) {
      const apiError = cause as LearningApiError;
      setError(apiError.message);
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  const createCourse = useCallback(
    async (input: CreateLearningCourseRequest) => {
      const created = await apiClient.createLearningCourse(input);
      setCourses((current) => [created, ...current.filter((course) => course.id !== created.id)]);
      return created;
    },
    [apiClient],
  );

  const publishCourse = useCallback(
    async (courseId: string) => {
      const published = await apiClient.publishLearningCourse(courseId);
      setCourses((current) =>
        current.map((course) => (course.id === published.id ? published : course)),
      );
      return published;
    },
    [apiClient],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return useMemo(
    () => ({
      courses,
      createCourse,
      error,
      loading,
      publishCourse,
      refresh,
    }),
    [courses, createCourse, error, loading, publishCourse, refresh],
  );
}
