import { afterEach, describe, expect, it, vi } from 'vitest';
import { E2E_REQUEST_CONTEXT_STORAGE_KEY } from '@/foundation/e2e/e2e-request-context';
import { AssessmentResultApiError, createAssessmentResultApiClient } from '../api';

function createJsonResponse(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, statusText: status === 200 ? 'OK' : 'Error', json: vi.fn(async () => body) } as unknown as Response;
}

function getFirstCall(fetchImpl: ReturnType<typeof vi.fn>): [string, RequestInit | undefined] {
  return fetchImpl.mock.calls[0] as [string, RequestInit | undefined];
}

describe('assessmentResultApiClient', () => {
  const originalMode = process.env.NEXT_PUBLIC_E2E_TEST_MODE;
  afterEach(() => {
    if (originalMode === undefined) delete process.env.NEXT_PUBLIC_E2E_TEST_MODE; else process.env.NEXT_PUBLIC_E2E_TEST_MODE = originalMode;
    vi.unstubAllGlobals();
  });

  it('calls release route', async () => {
    const fetchImpl = vi.fn(async () => createJsonResponse(200, { attemptId: 'attempt-1', answers: [] }));
    const client = createAssessmentResultApiClient({ fetchImpl });
    await client.releaseAssessmentResult('attempt-1');
    const call = getFirstCall(fetchImpl);
    expect(call[0]).toBe('/workspace/assessment-attempts/attempt-1/results/release');
    expect(String(call[1]?.body ?? '')).not.toContain('tenantId');
    expect(String(call[1]?.body ?? '')).not.toContain('workspaceId');
  });

  it('calls learner result route', async () => {
    const fetchImpl = vi.fn(async () => createJsonResponse(200, { attemptId: 'attempt-1', answers: [] }));
    await createAssessmentResultApiClient({ fetchImpl }).getLearnerAssessmentResult('attempt-1');
    expect(getFirstCall(fetchImpl)[0]).toBe('/workspace/assessment-attempts/attempt-1/results/me');
  });

  it('calls instructor result route', async () => {
    const fetchImpl = vi.fn(async () => createJsonResponse(200, { attemptId: 'attempt-1', answers: [] }));
    await createAssessmentResultApiClient({ fetchImpl }).getInstructorAssessmentResult('attempt-1');
    expect(getFirstCall(fetchImpl)[0]).toBe('/workspace/assessment-attempts/attempt-1/results/instructor');
  });

  it('normalizes errors', async () => {
    const fetchImpl = vi.fn(async () => createJsonResponse(403, { error: { code: 'FORBIDDEN', message: 'Denied', requestId: 'req-1' } }));
    await expect(createAssessmentResultApiClient({ fetchImpl }).getLearnerAssessmentResult('attempt-1')).rejects.toBeInstanceOf(AssessmentResultApiError);
  });

  it('sends e2e headers only in test mode', async () => {
    process.env.NEXT_PUBLIC_E2E_TEST_MODE = 'true';
    vi.stubGlobal('window', { localStorage: { getItem: vi.fn((key: string) => key === E2E_REQUEST_CONTEXT_STORAGE_KEY ? JSON.stringify({ requestId: 'r', correlationId: 'c', tenantId: 't', workspaceId: 'w', actorId: 'a' }) : null) } });
    const fetchImpl = vi.fn(async () => createJsonResponse(200, { attemptId: 'attempt-1', answers: [] }));
    await createAssessmentResultApiClient({ envSource: process.env, fetchImpl }).getLearnerAssessmentResult('attempt-1');
    const headers = getFirstCall(fetchImpl)[1]?.headers as Record<string, string>;
    expect(headers['x-tenant-id']).toBe('t');
    expect(headers['x-workspace-id']).toBe('w');
  });
});
