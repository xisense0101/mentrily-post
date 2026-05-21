import type {
  AssessmentContract,
  AssessmentPublishedSnapshotContract,
  CreateAssessmentRequest,
  ReplaceAssessmentContentRequest,
} from '../../src/modules/assessment-builder/types';
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
    throw new Error(`Assessment API E2E setup request failed (${response.status}): ${message}`);
  }

  return (await response.json()) as T;
}

export async function createAssessmentViaApi(
  context: E2ERequestContextHeaders,
  input: CreateAssessmentRequest,
): Promise<AssessmentContract> {
  return request<AssessmentContract>('/workspace/assessments', context, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function replaceAssessmentContentViaApi(
  context: E2ERequestContextHeaders,
  assessmentId: string,
  input: ReplaceAssessmentContentRequest,
): Promise<AssessmentContract> {
  return request<AssessmentContract>(`/workspace/assessments/${assessmentId}/content`, context, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function publishAssessmentViaApi(
  context: E2ERequestContextHeaders,
  assessmentId: string,
): Promise<AssessmentContract> {
  return request<AssessmentContract>(`/workspace/assessments/${assessmentId}/publish`, context, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function archiveAssessmentViaApi(
  context: E2ERequestContextHeaders,
  assessmentId: string,
): Promise<AssessmentContract> {
  return request<AssessmentContract>(`/workspace/assessments/${assessmentId}/archive`, context, {
    method: 'POST',
  });
}

export async function restoreAssessmentViaApi(
  context: E2ERequestContextHeaders,
  assessmentId: string,
): Promise<AssessmentContract> {
  return request<AssessmentContract>(`/workspace/assessments/${assessmentId}/restore`, context, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function getLatestSnapshotViaApi(
  context: E2ERequestContextHeaders,
  assessmentId: string,
): Promise<AssessmentPublishedSnapshotContract> {
  return request<AssessmentPublishedSnapshotContract>(
    `/workspace/assessments/${assessmentId}/snapshots/latest`,
    context,
  );
}

export async function getAssessmentViaApi(
  context: E2ERequestContextHeaders,
  assessmentId: string,
): Promise<AssessmentContract> {
  return request<AssessmentContract>(`/workspace/assessments/${assessmentId}`, context);
}
