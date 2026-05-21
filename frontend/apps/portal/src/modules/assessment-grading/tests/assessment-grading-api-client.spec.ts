import { afterEach, describe, expect, it, vi } from 'vitest';
import { AssessmentGradingApiError, createAssessmentGradingApiClient } from '../api';

function res(status: number, body: unknown): Response {
  return { ok: status >= 200 && status < 300, status, statusText: 'Error', json: vi.fn(async () => body) } as unknown as Response;
}

function first(fetchImpl: ReturnType<typeof vi.fn>): [string, RequestInit | undefined] {
  return fetchImpl.mock.calls[0] as [string, RequestInit | undefined];
}

describe('assessmentGradingApiClient', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('calls grade attempt route', async () => {
    const fetchImpl = vi.fn(async () => res(201, { id: 'run-1', answerGrades: [] }));
    const client = createAssessmentGradingApiClient({ fetchImpl });
    await client.gradeAssessmentAttempt('attempt-1');
    const [url, init] = first(fetchImpl);
    expect(url).toBe('/workspace/assessment-attempts/attempt-1/grade');
    expect(init?.method).toBe('POST');
  });

  it('calls latest grading run route', async () => {
    const fetchImpl = vi.fn(async () => res(200, { id: 'run-1', answerGrades: [] }));
    const client = createAssessmentGradingApiClient({ fetchImpl });
    await client.getLatestAssessmentGradingRun('attempt-1');
    expect(first(fetchImpl)[0]).toBe('/workspace/assessment-attempts/attempt-1/grading/latest');
  });

  it('calls get grading run route', async () => {
    const fetchImpl = vi.fn(async () => res(200, { id: 'run-1', answerGrades: [] }));
    const client = createAssessmentGradingApiClient({ fetchImpl });
    await client.getAssessmentGradingRun('run-1');
    expect(first(fetchImpl)[0]).toBe('/workspace/assessment-grading-runs/run-1');
  });

  it('calls pending manual review route', async () => {
    const fetchImpl = vi.fn(async () => res(200, { items: [] }));
    const client = createAssessmentGradingApiClient({ fetchImpl });
    await client.listPendingManualReview();
    expect(first(fetchImpl)[0]).toBe('/workspace/assessment-grading/manual-review');
  });

  it('calls manual grade route', async () => {
    const fetchImpl = vi.fn(async () => res(201, { id: 'run-1', answerGrades: [] }));
    const client = createAssessmentGradingApiClient({ fetchImpl });
    await client.manualGradeAssessmentAnswer('run-1', 'answer-1', { score: 1 });
    const [url, init] = first(fetchImpl);
    expect(url).toBe('/workspace/assessment-grading-runs/run-1/answers/answer-1/manual-grade');
    expect(init?.method).toBe('POST');
    expect(String(init?.body)).not.toContain('tenantId');
    expect(String(init?.body)).not.toContain('workspaceId');
  });

  it('normalizes errors', async () => {
    const fetchImpl = vi.fn(async () => res(400, { error: { code: 'BAD', message: 'bad request', requestId: 'r1' } }));
    const client = createAssessmentGradingApiClient({ fetchImpl });
    await expect(client.listPendingManualReview()).rejects.toBeInstanceOf(AssessmentGradingApiError);
  });
});
