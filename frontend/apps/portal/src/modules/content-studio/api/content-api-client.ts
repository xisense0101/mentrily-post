import { buildE2ERequestHeaders } from '@/foundation/e2e/e2e-request-context';
import type {
  ContentDocumentContract,
  ContentDocumentPurposeContract,
  ContentPublishedSnapshotContract,
  CreateContentDocumentRequest,
  PublishContentDocumentRequest,
  ReplaceContentBlocksRequest,
  RestoreContentDocumentRequest,
  UpdateContentDocumentRequest,
} from '../types';
import { ContentApiError } from './content-api-errors';

const PUBLIC_PLATFORM_API_URL =
  process.env.NEXT_PUBLIC_PLATFORM_API_URL ??
  process.env.NEXT_PUBLIC_PLATFORM_API_BASE_URL ??
  '';

interface ErrorEnvelope {
  error?: {
    code?: string;
    message?: string;
    requestId?: string;
  };
}

interface ContentApiClientOptions {
  baseUrl?: string;
  envSource?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
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

  throw new ContentApiError(
    envelope?.error?.message ?? response.statusText ?? 'Content API request failed',
    response.status,
    envelope?.error?.code,
    envelope?.error?.requestId,
  );
}

export function createContentApiClient({
  baseUrl,
  envSource,
  fetchImpl = fetch,
}: ContentApiClientOptions = {}) {
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
    listContentDocuments(input?: {
      purpose?: ContentDocumentPurposeContract;
    }): Promise<ContentDocumentContract[]> {
      const searchParams = new URLSearchParams();
      if (input?.purpose) {
        searchParams.set('purpose', input.purpose);
      }
      const query = searchParams.toString();

      return request<ContentDocumentContract[]>(
        `/workspace/content/documents${query ? `?${query}` : ''}`,
      );
    },
    getContentDocument(documentId: string): Promise<ContentDocumentContract> {
      return request<ContentDocumentContract>(
        `/workspace/content/documents/${documentId}`,
      );
    },
    createContentDocument(
      input: CreateContentDocumentRequest,
    ): Promise<ContentDocumentContract> {
      return request<ContentDocumentContract>('/workspace/content/documents', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
    updateContentDocument(
      documentId: string,
      input: UpdateContentDocumentRequest,
    ): Promise<ContentDocumentContract> {
      return request<ContentDocumentContract>(
        `/workspace/content/documents/${documentId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(input),
        },
      );
    },
    replaceContentBlocks(
      documentId: string,
      input: ReplaceContentBlocksRequest,
    ): Promise<ContentDocumentContract> {
      return request<ContentDocumentContract>(
        `/workspace/content/documents/${documentId}/blocks`,
        {
          method: 'PUT',
          body: JSON.stringify(input),
        },
      );
    },
    publishContentDocument(
      documentId: string,
      input: PublishContentDocumentRequest = {},
    ): Promise<ContentDocumentContract> {
      return request<ContentDocumentContract>(
        `/workspace/content/documents/${documentId}/publish`,
        {
          method: 'POST',
          body: JSON.stringify(input),
        },
      );
    },
    archiveContentDocument(documentId: string): Promise<ContentDocumentContract> {
      return request<ContentDocumentContract>(
        `/workspace/content/documents/${documentId}/archive`,
        {
          method: 'POST',
        },
      );
    },
    restoreContentDocument(
      documentId: string,
      input: RestoreContentDocumentRequest = {},
    ): Promise<ContentDocumentContract> {
      return request<ContentDocumentContract>(
        `/workspace/content/documents/${documentId}/restore`,
        {
          method: 'POST',
          body: JSON.stringify(input),
        },
      );
    },
    getLatestContentSnapshot(
      documentId: string,
    ): Promise<ContentPublishedSnapshotContract> {
      return request<ContentPublishedSnapshotContract>(
        `/workspace/content/documents/${documentId}/snapshots/latest`,
      );
    },
  };
}

export const contentApiClient = createContentApiClient();

export const listContentDocuments = contentApiClient.listContentDocuments;
export const getContentDocument = contentApiClient.getContentDocument;
export const createContentDocument = contentApiClient.createContentDocument;
export const updateContentDocument = contentApiClient.updateContentDocument;
export const replaceContentBlocks = contentApiClient.replaceContentBlocks;
export const publishContentDocument = contentApiClient.publishContentDocument;
export const archiveContentDocument = contentApiClient.archiveContentDocument;
export const restoreContentDocument = contentApiClient.restoreContentDocument;
export const getLatestContentSnapshot = contentApiClient.getLatestContentSnapshot;
