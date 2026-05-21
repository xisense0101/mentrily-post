import type {
  CompleteMediaUploadRequest,
  CreateMediaUploadIntentRequest,
  MediaAssetContract,
  MediaAssetStatusContract,
  MediaFileCategoryContract,
  MediaReadUrlContract,
  MediaUploadIntentContract,
} from '../types';
import { MediaLibraryApiError } from './media-library-api-errors';

function getE2EHeaders(): HeadersInit | undefined {
  if (process.env.NEXT_PUBLIC_E2E_TEST_MODE !== 'true') {
    return undefined;
  }

  return {
    'x-request-id': '77777777-7777-4777-8777-777777777777',
    'x-correlation-id': '88888888-8888-4888-8888-888888888888',
    'x-tenant-id': '33333333-3333-4333-8333-333333333333',
    'x-workspace-id': '44444444-4444-4444-8444-444444444444',
    'x-actor-id': '55555555-5555-4555-8555-555555555555',
  };
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const hasJsonBody = response.headers.get('content-type')?.includes('application/json');
  const data = hasJsonBody ? await response.json() : undefined;

  if (!response.ok) {
    const body = data as { message?: string; code?: string; details?: unknown } | undefined;
    throw new MediaLibraryApiError({
      message: body?.message ?? `Media API request failed with status ${response.status}`,
      status: response.status,
      code: body?.code,
      details: body?.details ?? data,
    });
  }

  return data as T;
}

async function requestJson<T>(input: {
  path: string;
  method: 'GET' | 'POST';
  body?: unknown;
}): Promise<T> {
  return parseJsonResponse<T>(
    await fetch(input.path, {
      method: input.method,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(input.body ? { 'Content-Type': 'application/json' } : {}),
        ...getE2EHeaders(),
      },
      ...(input.body ? { body: JSON.stringify(input.body) } : {}),
    }),
  );
}

export async function createMediaUploadIntent(
  input: CreateMediaUploadIntentRequest,
): Promise<MediaUploadIntentContract> {
  return requestJson<MediaUploadIntentContract>({
    path: '/workspace/media/upload-intents',
    method: 'POST',
    body: input,
  });
}

export async function completeMediaUpload(
  uploadIntentId: string,
  input?: CompleteMediaUploadRequest,
): Promise<MediaAssetContract> {
  return requestJson<MediaAssetContract>({
    path: `/workspace/media/upload-intents/${uploadIntentId}/complete`,
    method: 'POST',
    body: input ?? {},
  });
}

export async function listMediaAssets(input?: {
  status?: MediaAssetStatusContract;
  fileCategory?: MediaFileCategoryContract;
  ownerPrincipalId?: string;
}): Promise<MediaAssetContract[]> {
  const search = new URLSearchParams();
  if (input?.status) search.set('status', input.status);
  if (input?.fileCategory) search.set('fileCategory', input.fileCategory);
  if (input?.ownerPrincipalId) search.set('ownerPrincipalId', input.ownerPrincipalId);
  const suffix = search.size > 0 ? `?${search.toString()}` : '';

  return requestJson<MediaAssetContract[]>({
    path: `/workspace/media/assets${suffix}`,
    method: 'GET',
  });
}

export async function getMediaAsset(assetId: string): Promise<MediaAssetContract> {
  return requestJson<MediaAssetContract>({
    path: `/workspace/media/assets/${assetId}`,
    method: 'GET',
  });
}

export async function createMediaReadUrl(assetId: string): Promise<MediaReadUrlContract> {
  return requestJson<MediaReadUrlContract>({
    path: `/workspace/media/assets/${assetId}/read-url`,
    method: 'POST',
    body: {},
  });
}

export async function archiveMediaAsset(assetId: string): Promise<MediaAssetContract> {
  return requestJson<MediaAssetContract>({
    path: `/workspace/media/assets/${assetId}/archive`,
    method: 'POST',
    body: {},
  });
}
