import { afterEach, describe, expect, it, vi } from 'vitest';
import { AssessmentApiError, createAssessmentApiClient } from '../api';
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

const MOCK_ASSESSMENT = {
  id: 'assessment-1',
  title: 'Midterm Exam',
  purpose: 'EXAM',
  status: 'DRAFT',
  visibility: 'PRIVATE',
  ownerPrincipalId: 'principal-1',
  attemptPolicy: {},
  resultReleasePolicy: 'IMMEDIATE',
  metadata: {},
  gradingRubrics: [],
  gradingRules: [],
  createdAt: '2026-05-14T00:00:00.000Z',
  updatedAt: '2026-05-14T00:00:00.000Z',
};

describe('assessmentApiClient', () => {
  const originalMode = process.env.NEXT_PUBLIC_E2E_TEST_MODE;

  afterEach(() => {
    if (originalMode === undefined) {
      delete process.env.NEXT_PUBLIC_E2E_TEST_MODE;
    } else {
      process.env.NEXT_PUBLIC_E2E_TEST_MODE = originalMode;
    }
  });

  it('lists assessments with GET /workspace/assessments', async () => {
    const fetchImpl = vi.fn(async () => createJsonResponse(200, []));
    const client = createAssessmentApiClient({ fetchImpl });

    await client.listAssessments();

    const call = getFirstCall(fetchImpl);
    expect(call[0]).toBe('/workspace/assessments');
    expect(call[1]?.method).toBeUndefined();
  });

  it('creates assessment with POST /workspace/assessments without tenantId/workspaceId in body', async () => {
    const fetchImpl = vi.fn(async () => createJsonResponse(201, MOCK_ASSESSMENT));
    const client = createAssessmentApiClient({ fetchImpl });

    await client.createAssessment({ title: 'Midterm Exam', purpose: 'EXAM' });

    const call = getFirstCall(fetchImpl);
    expect(call[0]).toBe('/workspace/assessments');
    expect(call[1]?.method).toBe('POST');
    expect(String(call[1]?.body)).not.toContain('tenantId');
    expect(String(call[1]?.body)).not.toContain('workspaceId');
  });

  it('gets assessment with GET /workspace/assessments/:assessmentId', async () => {
    const fetchImpl = vi.fn(async () => createJsonResponse(200, MOCK_ASSESSMENT));
    const client = createAssessmentApiClient({ fetchImpl });

    await client.getAssessment('assessment-1');

    const call = getFirstCall(fetchImpl);
    expect(call[0]).toBe('/workspace/assessments/assessment-1');
    expect(call[1]?.method).toBeUndefined();
  });

  it('updates assessment with PATCH /workspace/assessments/:assessmentId', async () => {
    const fetchImpl = vi.fn(async () => createJsonResponse(200, MOCK_ASSESSMENT));
    const client = createAssessmentApiClient({ fetchImpl });

    await client.updateAssessment('assessment-1', { title: 'Updated' });

    const call = getFirstCall(fetchImpl);
    expect(call[0]).toBe('/workspace/assessments/assessment-1');
    expect(call[1]?.method).toBe('PATCH');
  });

  it('replaces content with PUT /workspace/assessments/:assessmentId/content', async () => {
    const fetchImpl = vi.fn(async () => createJsonResponse(200, MOCK_ASSESSMENT));
    const client = createAssessmentApiClient({ fetchImpl });

    await client.replaceAssessmentContent('assessment-1', {
      sections: [],
      looseQuestions: [],
    });

    const call = getFirstCall(fetchImpl);
    expect(call[0]).toBe('/workspace/assessments/assessment-1/content');
    expect(call[1]?.method).toBe('PUT');
  });

  it('publishes with POST /workspace/assessments/:assessmentId/publish', async () => {
    const fetchImpl = vi.fn(async () => createJsonResponse(200, MOCK_ASSESSMENT));
    const client = createAssessmentApiClient({ fetchImpl });

    await client.publishAssessment('assessment-1');

    const call = getFirstCall(fetchImpl);
    expect(call[0]).toBe('/workspace/assessments/assessment-1/publish');
    expect(call[1]?.method).toBe('POST');
  });

  it('archives with POST /workspace/assessments/:assessmentId/archive', async () => {
    const fetchImpl = vi.fn(async () => createJsonResponse(200, MOCK_ASSESSMENT));
    const client = createAssessmentApiClient({ fetchImpl });

    await client.archiveAssessment('assessment-1');

    const call = getFirstCall(fetchImpl);
    expect(call[0]).toBe('/workspace/assessments/assessment-1/archive');
    expect(call[1]?.method).toBe('POST');
  });

  it('restores with POST /workspace/assessments/:assessmentId/restore', async () => {
    const fetchImpl = vi.fn(async () => createJsonResponse(200, MOCK_ASSESSMENT));
    const client = createAssessmentApiClient({ fetchImpl });

    await client.restoreAssessment('assessment-1');

    const call = getFirstCall(fetchImpl);
    expect(call[0]).toBe('/workspace/assessments/assessment-1/restore');
    expect(call[1]?.method).toBe('POST');
  });

  it('gets latest snapshot with GET /workspace/assessments/:assessmentId/snapshots/latest', async () => {
    const fetchImpl = vi.fn(async () => createJsonResponse(200, { id: 'snapshot-1' }));
    const client = createAssessmentApiClient({ fetchImpl });

    await client.getLatestAssessmentSnapshot('assessment-1');

    const call = getFirstCall(fetchImpl);
    expect(call[0]).toBe('/workspace/assessments/assessment-1/snapshots/latest');
  });

  it('throws AssessmentApiError for API errors', async () => {
    const fetchImpl = vi.fn(async () =>
      createJsonResponse(400, {
        error: {
          code: 'ASSESSMENT_INVALID',
          message: 'Assessment request failed',
          requestId: 'request-1',
        },
      }),
    );
    const client = createAssessmentApiClient({ fetchImpl });

    await expect(client.listAssessments()).rejects.toBeInstanceOf(AssessmentApiError);
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
    const client = createAssessmentApiClient({
      envSource: process.env,
      fetchImpl,
    });

    vi.stubGlobal('window', { localStorage: storage });
    await client.listAssessments();

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
    const client = createAssessmentApiClient({
      envSource: process.env,
      fetchImpl,
    });

    vi.stubGlobal('window', {
      localStorage: { getItem: vi.fn(() => null) },
    });

    await client.listAssessments();

    const call = getFirstCall(fetchImpl);
    const headers = call[1]?.headers as Record<string, string>;
    expect(headers['x-request-id']).toBeUndefined();
    expect(headers['x-tenant-id']).toBeUndefined();
    vi.unstubAllGlobals();
  });
});
