import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  archiveMediaAsset,
  completeMediaUpload,
  createMediaReadUrl,
  createMediaUploadIntent,
  getMediaAsset,
  listMediaAssets,
} from '../api';
import { MediaLibraryApiError } from '../api';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('media-library-api-client', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls create upload intent route without tenant/workspace ids', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 'intent_1' }, 201));
    vi.stubGlobal('fetch', fetchMock);

    await createMediaUploadIntent({
      filename: 'file.pdf',
      contentType: 'application/pdf',
      fileCategory: 'DOCUMENT',
      maxSizeBytes: 1200,
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(fetchMock).toHaveBeenCalledWith('/workspace/media/upload-intents', expect.any(Object));
    expect(String(init.body)).not.toContain('tenantId');
    expect(String(init.body)).not.toContain('workspaceId');
    expect(String(init.body)).not.toContain('base64');
  });

  it('calls complete upload route', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 'asset_1' }, 201));
    vi.stubGlobal('fetch', fetchMock);
    await completeMediaUpload('intent_1', { sizeBytes: 200 });
    expect(fetchMock).toHaveBeenCalledWith('/workspace/media/upload-intents/intent_1/complete', expect.any(Object));
  });

  it('calls asset list/get/read-url/archive routes', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse([], 200))
      .mockResolvedValueOnce(jsonResponse({ id: 'asset_1' }, 200))
      .mockResolvedValueOnce(jsonResponse({ url: 'https://signed.test', method: 'GET', headers: {}, expiresAt: '2026-05-21T00:00:00.000Z' }, 201))
      .mockResolvedValueOnce(jsonResponse({ id: 'asset_1' }, 201));
    vi.stubGlobal('fetch', fetchMock);

    await listMediaAssets({ status: 'AVAILABLE', fileCategory: 'IMAGE', ownerPrincipalId: 'owner_1' });
    await getMediaAsset('asset_1');
    await createMediaReadUrl('asset_1');
    await archiveMediaAsset('asset_1');

    expect(fetchMock.mock.calls[0]?.[0]).toContain('/workspace/media/assets?');
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/workspace/media/assets/asset_1');
    expect(fetchMock.mock.calls[2]?.[0]).toBe('/workspace/media/assets/asset_1/read-url');
    expect(fetchMock.mock.calls[3]?.[0]).toBe('/workspace/media/assets/asset_1/archive');
  });

  it('normalizes errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ message: 'denied', code: 'FORBIDDEN' }, 403)));
    await expect(listMediaAssets()).rejects.toBeInstanceOf(MediaLibraryApiError);
  });
});
