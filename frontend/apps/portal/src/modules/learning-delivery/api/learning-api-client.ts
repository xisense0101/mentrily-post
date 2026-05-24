import type {
  AddLearningLessonRequest,
  AddLearningSectionRequest,
  CourseAssessmentProgressSummaryContract,
  CreateLearningAssessmentLinkRequest,
  CreateLearningCourseRequest,
  EnrollInLearningCourseRequest,
  LearnerCourseDeliveryContract,
  LearningAssessmentLinkContract,
  LearningCourseContract,
  LearningEnrollmentContract,
  LearningProgressContract,
  MarkLearningProgressRequest,
  ReorderLearningLessonsRequest,
  ReorderLearningSectionsRequest,
  UpdateLearningAssessmentLinkRequest,
  UpdateLearningCourseRequest,
} from '../types';
import { buildE2ERequestHeaders } from '@/foundation/e2e/e2e-request-context';
import { LearningApiError } from './learning-api-errors';

const PUBLIC_PLATFORM_API_URL =
  process.env.NEXT_PUBLIC_PLATFORM_API_URL ?? process.env.NEXT_PUBLIC_PLATFORM_API_BASE_URL ?? '';

interface ErrorEnvelope {
  error?: {
    code?: string;
    message?: string;
    requestId?: string;
    correlationId?: string;
  };
}

interface LearningApiClientOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  envSource?: NodeJS.ProcessEnv;
}

function resolveApiBaseUrl(baseUrl?: string, envSource?: NodeJS.ProcessEnv): string {
  return (
    baseUrl ??
    envSource?.NEXT_PUBLIC_PLATFORM_API_URL ??
    envSource?.NEXT_PUBLIC_PLATFORM_API_BASE_URL ??
    PUBLIC_PLATFORM_API_URL
  ).replace(/\/$/, '');
}

function withBaseUrl(baseUrl: string, path: string): string {
  if (!baseUrl) {
    return path;
  }

  return `${baseUrl}${path}`;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  let envelope: ErrorEnvelope | undefined;

  try {
    envelope = (await response.json()) as ErrorEnvelope;
  } catch {
    envelope = undefined;
  }

  throw new LearningApiError(
    envelope?.error?.message ?? response.statusText ?? 'Learning API request failed',
    response.status,
    envelope?.error?.code,
    envelope?.error?.requestId,
    envelope?.error?.correlationId,
  );
}

export function createLearningApiClient({
  baseUrl,
  fetchImpl = fetch,
  envSource,
}: LearningApiClientOptions = {}) {
  const apiBaseUrl = resolveApiBaseUrl(baseUrl, envSource);

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const e2eHeaders = buildE2ERequestHeaders(undefined, envSource);
    const response = await fetchImpl(withBaseUrl(apiBaseUrl, path), {
      credentials: 'include',
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...(e2eHeaders ?? {}),
        ...(init?.headers ?? {}),
      },
    });

    return parseResponse<T>(response);
  }

  return {
    listWorkspaceLearningCourses(): Promise<LearningCourseContract[]> {
      return request<LearningCourseContract[]>('/workspace/learning/courses');
    },
    getLearningCourse(courseId: string): Promise<LearningCourseContract> {
      return request<LearningCourseContract>(`/workspace/learning/courses/${courseId}`);
    },
    listCourseAssessmentLinks(courseId: string): Promise<LearningAssessmentLinkContract[]> {
      return request<LearningAssessmentLinkContract[]>(
        `/workspace/learning/courses/${courseId}/assessments`,
      );
    },
    createAssessmentLink(
      courseId: string,
      input: CreateLearningAssessmentLinkRequest,
    ): Promise<LearningAssessmentLinkContract> {
      return request<LearningAssessmentLinkContract>(
        `/workspace/learning/courses/${courseId}/assessments`,
        {
          method: 'POST',
          body: JSON.stringify(input),
        },
      );
    },
    updateAssessmentLink(
      courseId: string,
      linkId: string,
      input: UpdateLearningAssessmentLinkRequest,
    ): Promise<LearningAssessmentLinkContract> {
      return request<LearningAssessmentLinkContract>(
        `/workspace/learning/courses/${courseId}/assessments/${linkId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(input),
        },
      );
    },
    removeAssessmentLink(courseId: string, linkId: string): Promise<{ deleted: boolean }> {
      return request<{ deleted: boolean }>(
        `/workspace/learning/courses/${courseId}/assessments/${linkId}`,
        {
          method: 'DELETE',
        },
      );
    },
    getLearnerCourseDelivery(courseId: string): Promise<LearnerCourseDeliveryContract> {
      return request<LearnerCourseDeliveryContract>(
        `/workspace/learning/courses/${courseId}/delivery`,
      );
    },
    getCourseAssessmentProgressSummary(
      courseId: string,
    ): Promise<CourseAssessmentProgressSummaryContract> {
      return request<CourseAssessmentProgressSummaryContract>(
        `/workspace/learning/courses/${courseId}/progress-summary`,
      );
    },
    createLearningCourse(input: CreateLearningCourseRequest): Promise<LearningCourseContract> {
      return request<LearningCourseContract>('/workspace/learning/courses', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
    updateLearningCourse(
      courseId: string,
      input: UpdateLearningCourseRequest,
    ): Promise<LearningCourseContract> {
      return request<LearningCourseContract>(`/workspace/learning/courses/${courseId}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      });
    },
    addLearningSection(
      courseId: string,
      input: AddLearningSectionRequest,
    ): Promise<LearningCourseContract> {
      return request<LearningCourseContract>(`/workspace/learning/courses/${courseId}/sections`, {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
    addLearningLesson(
      courseId: string,
      sectionId: string,
      input: AddLearningLessonRequest,
    ): Promise<LearningCourseContract> {
      return request<LearningCourseContract>(
        `/workspace/learning/courses/${courseId}/sections/${sectionId}/lessons`,
        {
          method: 'POST',
          body: JSON.stringify(input),
        },
      );
    },
    reorderLearningSections(
      courseId: string,
      input: ReorderLearningSectionsRequest,
    ): Promise<LearningCourseContract> {
      return request<LearningCourseContract>(
        `/workspace/learning/courses/${courseId}/sections/reorder`,
        {
          method: 'PATCH',
          body: JSON.stringify(input),
        },
      );
    },
    reorderLearningLessons(
      courseId: string,
      sectionId: string,
      input: ReorderLearningLessonsRequest,
    ): Promise<LearningCourseContract> {
      return request<LearningCourseContract>(
        `/workspace/learning/courses/${courseId}/sections/${sectionId}/lessons/reorder`,
        {
          method: 'PATCH',
          body: JSON.stringify(input),
        },
      );
    },
    publishLearningCourse(courseId: string): Promise<LearningCourseContract> {
      return request<LearningCourseContract>(`/workspace/learning/courses/${courseId}/publish`, {
        method: 'POST',
      });
    },
    archiveLearningCourse(courseId: string): Promise<LearningCourseContract> {
      return request<LearningCourseContract>(`/workspace/learning/courses/${courseId}/archive`, {
        method: 'POST',
      });
    },
    enrollInLearningCourse(
      courseId: string,
      input: EnrollInLearningCourseRequest = {},
    ): Promise<LearningEnrollmentContract> {
      return request<LearningEnrollmentContract>(`/workspace/learning/courses/${courseId}/enroll`, {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
    listLearnerEnrollments(): Promise<LearningEnrollmentContract[]> {
      return request<LearningEnrollmentContract[]>('/workspace/learning/enrollments');
    },
    markLearningProgress(
      enrollmentId: string,
      lessonId: string,
      input: MarkLearningProgressRequest,
    ): Promise<LearningProgressContract> {
      return request<LearningProgressContract>(
        `/workspace/learning/enrollments/${enrollmentId}/progress/${lessonId}`,
        {
          method: 'POST',
          body: JSON.stringify(input),
        },
      );
    },
    completeLearningEnrollment(enrollmentId: string): Promise<LearningEnrollmentContract> {
      return request<LearningEnrollmentContract>(
        `/workspace/learning/enrollments/${enrollmentId}/complete`,
        {
          method: 'POST',
        },
      );
    },
  };
}

export const learningApiClient = createLearningApiClient();

export const {
  addLearningLesson,
  addLearningSection,
  archiveLearningCourse,
  completeLearningEnrollment,
  createAssessmentLink,
  createLearningCourse,
  enrollInLearningCourse,
  getCourseAssessmentProgressSummary,
  getLearnerCourseDelivery,
  getLearningCourse,
  listLearnerEnrollments,
  listCourseAssessmentLinks,
  listWorkspaceLearningCourses,
  markLearningProgress,
  publishLearningCourse,
  reorderLearningLessons,
  reorderLearningSections,
  removeAssessmentLink,
  updateAssessmentLink,
  updateLearningCourse,
} = learningApiClient;
