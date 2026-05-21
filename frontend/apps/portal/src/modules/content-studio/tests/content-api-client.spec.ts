import { afterEach, describe, expect, it, vi } from 'vitest';
import { ContentApiError, createContentApiClient } from '../api';
import { E2E_REQUEST_CONTEXT_STORAGE_KEY } from '@/foundation/e2e/e2e-request-context';

function createJsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: vi.fn(async () => body),
  } as unknown as Response;
}

function getFirstCall(fetchImpl: ReturnType<typeof vi.fn>): [string, RequestInit | undefined] {
  return fetchImpl.mock.calls[0] as unknown as [string, RequestInit | undefined];
}

describe('contentApiClient', () => {
  const originalMode = process.env.NEXT_PUBLIC_E2E_TEST_MODE;

  afterEach(() => {
    if (originalMode === undefined) {
      delete process.env.NEXT_PUBLIC_E2E_TEST_MODE;
    } else {
      process.env.NEXT_PUBLIC_E2E_TEST_MODE = originalMode;
    }
  });

  it('lists documents with GET /workspace/content/documents', async () => {
    const fetchImpl = vi.fn(async () => createJsonResponse(200, []));
    const client = createContentApiClient({ fetchImpl });

    await client.listContentDocuments();

    const call = getFirstCall(fetchImpl);
    expect(call[0]).toBe('/workspace/content/documents');
    expect(call[1]?.method).toBeUndefined();
  });

  it('creates documents with POST /workspace/content/documents without tenant or workspace in body', async () => {
    const fetchImpl = vi.fn(async () =>
      createJsonResponse(201, {
        id: 'doc-1',
        title: 'Content',
        purpose: 'GENERAL_PAGE',
        status: 'DRAFT',
        ownerPrincipalId: 'principal-1',
        createdAt: '2026-05-13T00:00:00.000Z',
        updatedAt: '2026-05-13T00:00:00.000Z',
      }),
    );
    const client = createContentApiClient({ fetchImpl });

    await client.createContentDocument({
      title: 'Content',
      purpose: 'GENERAL_PAGE',
    });

    const call = getFirstCall(fetchImpl);
    expect(call[0]).toBe('/workspace/content/documents');
    expect(call[1]?.method).toBe('POST');
    expect(String(call[1]?.body)).not.toContain('tenantId');
    expect(String(call[1]?.body)).not.toContain('workspaceId');
  });

  it('gets a document with GET /workspace/content/documents/:documentId', async () => {
    const fetchImpl = vi.fn(async () => createJsonResponse(200, { id: 'doc-1' }));
    const client = createContentApiClient({ fetchImpl });

    await client.getContentDocument('doc-1');

    const call = getFirstCall(fetchImpl);
    expect(call[0]).toBe('/workspace/content/documents/doc-1');
  });

  it('updates a document with PATCH /workspace/content/documents/:documentId', async () => {
    const fetchImpl = vi.fn(async () => createJsonResponse(200, { id: 'doc-1' }));
    const client = createContentApiClient({ fetchImpl });

    await client.updateContentDocument('doc-1', { title: 'Renamed' });

    const call = getFirstCall(fetchImpl);
    expect(call[0]).toBe('/workspace/content/documents/doc-1');
    expect(call[1]?.method).toBe('PATCH');
  });

  it('replaces blocks with PUT /workspace/content/documents/:documentId/blocks', async () => {
    const fetchImpl = vi.fn(async () => createJsonResponse(200, { id: 'doc-1' }));
    const client = createContentApiClient({ fetchImpl });

    await client.replaceContentBlocks('doc-1', { blocks: [] });

    const call = getFirstCall(fetchImpl);
    expect(call[0]).toBe('/workspace/content/documents/doc-1/blocks');
    expect(call[1]?.method).toBe('PUT');
  });

  it('publishes with POST /workspace/content/documents/:documentId/publish', async () => {
    const fetchImpl = vi.fn(async () => createJsonResponse(200, { id: 'doc-1' }));
    const client = createContentApiClient({ fetchImpl });

    await client.publishContentDocument('doc-1');

    const call = getFirstCall(fetchImpl);
    expect(call[0]).toBe('/workspace/content/documents/doc-1/publish');
    expect(call[1]?.method).toBe('POST');
  });

  it('archives with POST /workspace/content/documents/:documentId/archive', async () => {
    const fetchImpl = vi.fn(async () => createJsonResponse(200, { id: 'doc-1' }));
    const client = createContentApiClient({ fetchImpl });

    await client.archiveContentDocument('doc-1');

    const call = getFirstCall(fetchImpl);
    expect(call[0]).toBe('/workspace/content/documents/doc-1/archive');
    expect(call[1]?.method).toBe('POST');
  });

  it('restores with POST /workspace/content/documents/:documentId/restore', async () => {
    const fetchImpl = vi.fn(async () => createJsonResponse(200, { id: 'doc-1' }));
    const client = createContentApiClient({ fetchImpl });

    await client.restoreContentDocument('doc-1');

    const call = getFirstCall(fetchImpl);
    expect(call[0]).toBe('/workspace/content/documents/doc-1/restore');
    expect(call[1]?.method).toBe('POST');
  });

  it('gets the latest snapshot with GET /workspace/content/documents/:documentId/snapshots/latest', async () => {
    const fetchImpl = vi.fn(async () => createJsonResponse(200, { id: 'snapshot-1' }));
    const client = createContentApiClient({ fetchImpl });

    await client.getLatestContentSnapshot('doc-1');

    const call = getFirstCall(fetchImpl);
    expect(call[0]).toBe('/workspace/content/documents/doc-1/snapshots/latest');
  });

  it('throws ContentApiError for API errors', async () => {
    const fetchImpl = vi.fn(async () =>
      createJsonResponse(400, {
        error: {
          code: 'CONTENT_INVALID',
          message: 'Content request failed',
          requestId: 'request-1',
        },
      }),
    );
    const client = createContentApiClient({ fetchImpl });

    await expect(client.listContentDocuments()).rejects.toBeInstanceOf(ContentApiError);
  });

  it('sends E2E request headers only when test mode is enabled', async () => {
    process.env.NEXT_PUBLIC_E2E_TEST_MODE = 'true';
    const fetchImpl = vi.fn(async () => createJsonResponse(200, []));
    const storage = {
      getItem: vi.fn((key: string) =>
        key === E2E_REQUEST_CONTEXT_STORAGE_KEY
          ? JSON.stringify({
              requestId: 'request-e2e',
              correlationId: 'correlation-e2e',
              tenantId: 'tenant-e2e',
              workspaceId: 'workspace-e2e',
              actorId: 'actor-e2e',
            })
          : null,
      ),
    };
    const client = createContentApiClient({
      envSource: process.env,
      fetchImpl,
    });

    vi.stubGlobal('window', { localStorage: storage });

    await client.listContentDocuments();

    const call = getFirstCall(fetchImpl);
    const headers = call[1]?.headers as Record<string, string>;
    expect(headers['x-request-id']).toBe('request-e2e');
    expect(headers['x-correlation-id']).toBe('correlation-e2e');
    expect(headers['x-tenant-id']).toBe('tenant-e2e');
    expect(headers['x-workspace-id']).toBe('workspace-e2e');
    expect(headers['x-actor-id']).toBe('actor-e2e');
    vi.unstubAllGlobals();
  });

  it('does not send E2E request headers in normal mode', async () => {
    process.env.NEXT_PUBLIC_E2E_TEST_MODE = 'false';
    const fetchImpl = vi.fn(async () => createJsonResponse(200, []));
    const storage = {
      getItem: vi.fn(() =>
        JSON.stringify({
          requestId: 'request-e2e',
          correlationId: 'correlation-e2e',
          tenantId: 'tenant-e2e',
          workspaceId: 'workspace-e2e',
          actorId: 'actor-e2e',
        }),
      ),
    };
    const client = createContentApiClient({
      envSource: process.env,
      fetchImpl,
    });

    vi.stubGlobal('window', { localStorage: storage });

    await client.listContentDocuments();

    const call = getFirstCall(fetchImpl);
    const headers = call[1]?.headers as Record<string, string>;
    expect(headers['x-request-id']).toBeUndefined();
    expect(headers['x-tenant-id']).toBeUndefined();
    vi.unstubAllGlobals();
  });
});
