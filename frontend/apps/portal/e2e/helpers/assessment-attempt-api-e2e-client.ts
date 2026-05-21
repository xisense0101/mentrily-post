import type {
  AssessmentAttemptContract,
  AssessmentPublishedSnapshotContract,
  CreateAssessmentRequest,
  ReplaceAssessmentContentRequest,
} from '../../src/contracts/assessment-delivery';
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
    throw new Error(`Assessment attempt API E2E request failed (${response.status}): ${message}`);
  }

  return (await response.json()) as T;
}

export async function createAndPublishAssessmentForAttempt(
  context: E2ERequestContextHeaders,
  input: CreateAssessmentRequest,
  content: ReplaceAssessmentContentRequest,
): Promise<{ assessmentId: string }> {
  const assessment = await request<{ id: string }>('/workspace/assessments', context, {
    method: 'POST',
    body: JSON.stringify(input),
  });

  await request(`/workspace/assessments/${assessment.id}/content`, context, {
    method: 'PUT',
    body: JSON.stringify(content),
  });

  await request(`/workspace/assessments/${assessment.id}/publish`, context, {
    method: 'POST',
    body: JSON.stringify({}),
  });

  return { assessmentId: assessment.id };
}

export async function getAssessmentAttemptViaApi(
  context: E2ERequestContextHeaders,
  attemptId: string,
): Promise<AssessmentAttemptContract> {
  return request<AssessmentAttemptContract>(`/workspace/assessment-attempts/${attemptId}`, context);
}

export async function getAssessmentAttemptSnapshotViaApi(
  context: E2ERequestContextHeaders,
  attemptId: string,
): Promise<AssessmentPublishedSnapshotContract> {
  return request<AssessmentPublishedSnapshotContract>(
    `/workspace/assessment-attempts/${attemptId}/snapshot`,
    context,
  );
}

export async function saveAssessmentAttemptAnswerViaApi(
  context: E2ERequestContextHeaders,
  attemptId: string,
  questionId: string,
  payload: Record<string, unknown>,
): Promise<AssessmentAttemptContract> {
  return request<AssessmentAttemptContract>(
    `/workspace/assessment-attempts/${attemptId}/answers/${questionId}`,
    context,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
  );
}
