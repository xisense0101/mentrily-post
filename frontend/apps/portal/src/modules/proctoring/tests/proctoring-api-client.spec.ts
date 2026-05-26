import { describe, expect, it, vi } from 'vitest';
import { createProctoringApiClient } from '../api/proctoring-api-client';

function createJsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: vi.fn(async () => body),
  } as unknown as Response;
}

describe('proctoringApiClient', () => {
  it('starts a proctoring session without tenant or workspace ids in the body', async () => {
    const fetchImpl = vi.fn(async () => createJsonResponse(200, { summary: { enabled: true } }));
    const client = createProctoringApiClient({ fetchImpl });

    await client.startProctoringSession('attempt-1');

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/workspace/proctoring/attempts/attempt-1/session/start');
    expect(init.method).toBe('POST');
    expect(String(init.body ?? '')).not.toContain('tenantId');
    expect(String(init.body ?? '')).not.toContain('workspaceId');
  });

  it('records metadata-only events', async () => {
    const fetchImpl = vi.fn(async () => createJsonResponse(200, { duplicate: false, event: {} }));
    const client = createProctoringApiClient({ fetchImpl });

    await client.recordProctoringEvent('session-1', {
      eventType: 'COPY_ATTEMPTED',
      metadata: { questionId: 'question-1' },
    });

    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(String(init.body)).not.toContain('clipboardData');
  });
});
