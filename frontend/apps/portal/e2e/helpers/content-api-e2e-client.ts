import type {
  ContentDocumentContract,
  ContentPublishedSnapshotContract,
  CreateContentDocumentRequest,
  ReplaceContentBlocksRequest,
} from '../../src/modules/content-studio/types';
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
    throw new Error(`Content API E2E setup request failed (${response.status}): ${message}`);
  }

  return (await response.json()) as T;
}

export async function createDocumentViaApi(
  context: E2ERequestContextHeaders,
  input: CreateContentDocumentRequest,
): Promise<ContentDocumentContract> {
  return request<ContentDocumentContract>('/workspace/content/documents', context, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function replaceBlocksViaApi(
  context: E2ERequestContextHeaders,
  documentId: string,
  input: ReplaceContentBlocksRequest,
): Promise<ContentDocumentContract> {
  return request<ContentDocumentContract>(
    `/workspace/content/documents/${documentId}/blocks`,
    context,
    {
      method: 'PUT',
      body: JSON.stringify(input),
    },
  );
}

export async function publishDocumentViaApi(
  context: E2ERequestContextHeaders,
  documentId: string,
): Promise<ContentDocumentContract> {
  return request<ContentDocumentContract>(
    `/workspace/content/documents/${documentId}/publish`,
    context,
    {
      method: 'POST',
      body: JSON.stringify({}),
    },
  );
}

export async function archiveDocumentViaApi(
  context: E2ERequestContextHeaders,
  documentId: string,
): Promise<ContentDocumentContract> {
  return request<ContentDocumentContract>(
    `/workspace/content/documents/${documentId}/archive`,
    context,
    {
      method: 'POST',
    },
  );
}

export async function restoreDocumentViaApi(
  context: E2ERequestContextHeaders,
  documentId: string,
): Promise<ContentDocumentContract> {
  return request<ContentDocumentContract>(
    `/workspace/content/documents/${documentId}/restore`,
    context,
    {
      method: 'POST',
      body: JSON.stringify({}),
    },
  );
}

export async function getLatestSnapshotViaApi(
  context: E2ERequestContextHeaders,
  documentId: string,
): Promise<ContentPublishedSnapshotContract> {
  return request<ContentPublishedSnapshotContract>(
    `/workspace/content/documents/${documentId}/snapshots/latest`,
    context,
  );
}
