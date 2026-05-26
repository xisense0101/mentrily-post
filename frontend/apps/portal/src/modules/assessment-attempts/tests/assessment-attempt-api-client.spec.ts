import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAssessmentAttemptApiClient } from '../api';
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

const MOCK_ATTEMPT = {
  id: 'attempt-1',
  assessmentId: 'assessment-1',
  snapshotId: 'snapshot-1',
  snapshotVersionNumber: 1,
  learnerPrincipalId: 'learner-1',
  status: 'IN_PROGRESS',
  serverNow: '2026-05-17T00:05:00.000Z',
  canEdit: true,
  canSubmit: true,
  session: {
    id: 'session-1',
    startedAt: '2026-05-17T00:00:00.000Z',
    lastSeenAt: '2026-05-17T00:05:00.000Z',
  },
  answers: [],
  metadata: {},
  startedAt: '2026-05-17T00:00:00.000Z',
  createdAt: '2026-05-17T00:00:00.000Z',
  updatedAt: '2026-05-17T00:05:00.000Z',
} as const;

describe('assessmentAttemptApiClient', () => {
  const originalMode = process.env.NEXT_PUBLIC_E2E_TEST_MODE;

  afterEach(() => {
    if (originalMode === undefined) {
      delete process.env.NEXT_PUBLIC_E2E_TEST_MODE;
    } else {
      process.env.NEXT_PUBLIC_E2E_TEST_MODE = originalMode;
    }
    vi.unstubAllGlobals();
  });

  it('starts attempt with POST /workspace/assessments/:assessmentId/attempts', async () => {
    const fetchImpl = vi.fn(async () => createJsonResponse(201, MOCK_ATTEMPT));
    const client = createAssessmentAttemptApiClient({ fetchImpl });

    await client.startAssessmentAttempt('assessment-1', { metadata: { source: 'test' } });

    const call = getFirstCall(fetchImpl);
    expect(call[0]).toBe('/workspace/assessments/assessment-1/attempts');
    expect(call[1]?.method).toBe('POST');
    expect(String(call[1]?.body)).not.toContain('tenantId');
    expect(String(call[1]?.body)).not.toContain('workspaceId');
  });

  it('lists attempts with GET /workspace/assessment-attempts', async () => {
    const fetchImpl = vi.fn(async () => createJsonResponse(200, [MOCK_ATTEMPT]));
    const client = createAssessmentAttemptApiClient({ fetchImpl });

    await client.listLearnerAssessmentAttempts();

    const call = getFirstCall(fetchImpl);
    expect(call[0]).toBe('/workspace/assessment-attempts');
    expect(call[1]?.method).toBeUndefined();
  });

  it('gets attempt with GET /workspace/assessment-attempts/:attemptId', async () => {
    const fetchImpl = vi.fn(async () => createJsonResponse(200, MOCK_ATTEMPT));
    const client = createAssessmentAttemptApiClient({ fetchImpl });

    await client.getAssessmentAttempt('attempt-1');

    const call = getFirstCall(fetchImpl);
    expect(call[0]).toBe('/workspace/assessment-attempts/attempt-1');
  });

  it('gets attempt snapshot with GET /workspace/assessment-attempts/:attemptId/snapshot', async () => {
    const fetchImpl = vi.fn(async () => createJsonResponse(200, { id: 'snapshot-1' }));
    const client = createAssessmentAttemptApiClient({ fetchImpl });

    await client.getAssessmentAttemptSnapshot('attempt-1');

    const call = getFirstCall(fetchImpl);
    expect(call[0]).toBe('/workspace/assessment-attempts/attempt-1/snapshot');
  });

  it('saves answer with PUT /workspace/assessment-attempts/:attemptId/answers/:questionId', async () => {
    const fetchImpl = vi.fn(async () => createJsonResponse(200, MOCK_ATTEMPT));
    const client = createAssessmentAttemptApiClient({ fetchImpl });

    await client.saveAssessmentAttemptAnswer('attempt-1', 'question-1', {
      questionId: 'question-1',
      questionKind: 'SHORT_ANSWER',
      answer: { text: 'Hello' },
    });

    const call = getFirstCall(fetchImpl);
    expect(call[0]).toBe('/workspace/assessment-attempts/attempt-1/answers/question-1');
    expect(call[1]?.method).toBe('PUT');
  });

  it('submits attempt with POST /workspace/assessment-attempts/:attemptId/submit', async () => {
    const fetchImpl = vi.fn(async () => createJsonResponse(201, MOCK_ATTEMPT));
    const client = createAssessmentAttemptApiClient({ fetchImpl });

    await client.submitAssessmentAttempt('attempt-1');

    const call = getFirstCall(fetchImpl);
    expect(call[0]).toBe('/workspace/assessment-attempts/attempt-1/submit');
    expect(call[1]?.method).toBe('POST');
  });

  it('cancels attempt with POST /workspace/assessment-attempts/:attemptId/cancel', async () => {
    const fetchImpl = vi.fn(async () => createJsonResponse(201, MOCK_ATTEMPT));
    const client = createAssessmentAttemptApiClient({ fetchImpl });

    await client.cancelAssessmentAttempt('attempt-1');

    const call = getFirstCall(fetchImpl);
    expect(call[0]).toBe('/workspace/assessment-attempts/attempt-1/cancel');
    expect(call[1]?.method).toBe('POST');
  });

  it('throws normalized errors', async () => {
    const fetchImpl = vi.fn(async () =>
      createJsonResponse(400, {
        error: {
          code: 'ATTEMPT_INVALID',
          message: 'Attempt request failed',
          requestId: 'request-1',
          details: { reason: 'ATTEMPT_EXPIRED' },
        },
      }),
    );
    const client = createAssessmentAttemptApiClient({ fetchImpl });

    await expect(client.listLearnerAssessmentAttempts()).rejects.toMatchObject({
      name: 'AssessmentAttemptApiError',
      code: 'ATTEMPT_INVALID',
      requestId: 'request-1',
      details: { reason: 'ATTEMPT_EXPIRED' },
    });
  });

  it('sends E2E headers only in test mode', async () => {
    process.env.NEXT_PUBLIC_E2E_TEST_MODE = 'true';
    const fetchImpl = vi.fn(async () => createJsonResponse(200, []));
    const client = createAssessmentAttemptApiClient({
      envSource: process.env,
      fetchImpl,
    });

    vi.stubGlobal('window', {
      localStorage: {
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
      },
    });

    await client.listLearnerAssessmentAttempts();

    const call = getFirstCall(fetchImpl);
    const headers = call[1]?.headers as Record<string, string>;
    expect(headers['x-tenant-id']).toBe('tenant-e2e');
    expect(headers['x-workspace-id']).toBe('workspace-e2e');
  });
});
