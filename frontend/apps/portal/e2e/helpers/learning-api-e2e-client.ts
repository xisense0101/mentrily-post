import type {
  AddLearningLessonRequest,
  AddLearningSectionRequest,
  CreateLearningCourseRequest,
  LearningCourseContract,
} from '../../src/modules/learning-delivery/types';
import type { E2ERequestContextHeaders } from '../../src/foundation/e2e/e2e-request-context';

const DEFAULT_API_URL = 'http://localhost:3001';

function resolveApiBaseUrl(): string {
  return (
    process.env.PLATFORM_API_URL ??
    process.env.NEXT_PUBLIC_PLATFORM_API_URL ??
    DEFAULT_API_URL
  ).replace(/\/$/, '');
}

async function request<T>(
  path: string,
  context: E2ERequestContextHeaders,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${resolveApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      'x-request-id': context.requestId,
      'x-correlation-id': context.correlationId,
      'x-tenant-id': context.tenantId,
      'x-workspace-id': context.workspaceId,
      'x-actor-id': context.actorId,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Learning API E2E setup request failed (${response.status}): ${message}`);
  }

  return (await response.json()) as T;
}

export async function createCourseViaApi(
  context: E2ERequestContextHeaders,
  input: CreateLearningCourseRequest,
): Promise<LearningCourseContract> {
  return request<LearningCourseContract>('/workspace/learning/courses', context, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function addSectionViaApi(
  context: E2ERequestContextHeaders,
  courseId: string,
  input: AddLearningSectionRequest,
): Promise<LearningCourseContract> {
  return request<LearningCourseContract>(
    `/workspace/learning/courses/${courseId}/sections`,
    context,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
}

export async function addLessonViaApi(
  context: E2ERequestContextHeaders,
  courseId: string,
  sectionId: string,
  input: AddLearningLessonRequest,
): Promise<LearningCourseContract> {
  return request<LearningCourseContract>(
    `/workspace/learning/courses/${courseId}/sections/${sectionId}/lessons`,
    context,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
}

export async function publishCourseViaApi(
  context: E2ERequestContextHeaders,
  courseId: string,
): Promise<LearningCourseContract> {
  return request<LearningCourseContract>(
    `/workspace/learning/courses/${courseId}/publish`,
    context,
    {
      method: 'POST',
      body: JSON.stringify({}),
    },
  );
}
