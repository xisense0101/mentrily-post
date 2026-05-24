import { describe, expect, it, vi } from 'vitest';
import { createLearningApiClient } from '../api';
import { LearningApiError } from '../api/learning-api-errors';
import { buildE2ERequestHeaders } from '@/foundation/e2e/e2e-request-context';

function createJsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: vi.fn(async () => body),
  } as unknown as Response;
}

describe('learningApiClient', () => {
  it('builds E2E headers only when test mode is enabled', () => {
    const storage = {
      getItem: vi.fn(() =>
        JSON.stringify({
          requestId: 'request-1',
          correlationId: 'correlation-1',
          tenantId: 'tenant-1',
          workspaceId: 'workspace-1',
          actorId: 'actor-1',
        }),
      ),
    };

    expect(
      buildE2ERequestHeaders(storage, {
        ...process.env,
        NEXT_PUBLIC_E2E_TEST_MODE: 'false',
      }),
    ).toBeUndefined();

    expect(
      buildE2ERequestHeaders(storage, {
        ...process.env,
        NEXT_PUBLIC_E2E_TEST_MODE: 'true',
      }),
    ).toEqual({
      'x-request-id': 'request-1',
      'x-correlation-id': 'correlation-1',
      'x-tenant-id': 'tenant-1',
      'x-workspace-id': 'workspace-1',
      'x-actor-id': 'actor-1',
    });
  });

  it('returns no E2E headers when test context is missing or invalid', () => {
    const missingStorage = {
      getItem: vi.fn(() => null),
    };
    const invalidStorage = {
      getItem: vi.fn(() => '{"requestId":"request-1"}'),
    };

    expect(
      buildE2ERequestHeaders(missingStorage, {
        ...process.env,
        NEXT_PUBLIC_E2E_TEST_MODE: 'true',
      }),
    ).toBeUndefined();
    expect(
      buildE2ERequestHeaders(invalidStorage, {
        ...process.env,
        NEXT_PUBLIC_E2E_TEST_MODE: 'true',
      }),
    ).toBeUndefined();
  });

  it('lists workspace courses with GET /workspace/learning/courses', async () => {
    const fetchImpl = vi.fn(async () => createJsonResponse(200, []));
    const client = createLearningApiClient({ fetchImpl });

    await client.listWorkspaceLearningCourses();

    const calls = fetchImpl.mock.calls as unknown as [string, RequestInit | undefined][];

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(calls[0]?.[0]).toBe('/workspace/learning/courses');
    expect(calls[0]?.[1]).toEqual(
      expect.objectContaining({
        credentials: 'include',
        headers: { Accept: 'application/json' },
      }),
    );
  });

  it('creates a course with POST /workspace/learning/courses without tenant or workspace in body', async () => {
    const fetchImpl = vi.fn(async () =>
      createJsonResponse(201, {
        id: 'course-1',
        title: 'API Foundations',
        slug: 'api-foundations',
        status: 'DRAFT',
        visibility: 'WORKSPACE',
        sections: [],
      }),
    );
    const client = createLearningApiClient({ fetchImpl });

    await client.createLearningCourse({
      title: 'API Foundations',
      slug: 'api-foundations',
      visibility: 'WORKSPACE',
    });

    const calls = fetchImpl.mock.calls as unknown as [string, RequestInit | undefined][];
    const request = calls[0]?.[1];

    expect(calls[0]?.[0]).toBe('/workspace/learning/courses');
    expect(request?.method).toBe('POST');
    expect(JSON.parse(String(request?.body))).toEqual({
      title: 'API Foundations',
      slug: 'api-foundations',
      visibility: 'WORKSPACE',
    });
    expect(String(request?.body)).not.toContain('tenantId');
    expect(String(request?.body)).not.toContain('workspaceId');
  });

  it('sends E2E request headers only in E2E mode', async () => {
    const fetchImpl = vi.fn(async () => createJsonResponse(200, []));
    const originalMode = process.env.NEXT_PUBLIC_E2E_TEST_MODE;
    const originalLocalStorage = window.localStorage;
    const storage = {
      getItem: vi.fn(() =>
        JSON.stringify({
          requestId: 'request-1',
          correlationId: 'correlation-1',
          tenantId: 'tenant-1',
          workspaceId: 'workspace-1',
          actorId: 'actor-1',
        }),
      ),
    };

    process.env.NEXT_PUBLIC_E2E_TEST_MODE = 'true';
    Object.defineProperty(window, 'localStorage', {
      value: storage,
      configurable: true,
    });

    const e2eClient = createLearningApiClient({
      fetchImpl,
      envSource: {
        ...process.env,
        NEXT_PUBLIC_E2E_TEST_MODE: 'true',
      },
    });
    await e2eClient.listWorkspaceLearningCourses();

    const e2eCalls = fetchImpl.mock.calls as unknown as [string, RequestInit | undefined][];
    const e2eHeaders = e2eCalls[0]?.[1]?.headers as Record<string, string>;
    expect(e2eHeaders['x-tenant-id']).toBe('tenant-1');
    expect(e2eHeaders['x-workspace-id']).toBe('workspace-1');
    expect(e2eHeaders['x-actor-id']).toBe('actor-1');

    fetchImpl.mockClear();
    process.env.NEXT_PUBLIC_E2E_TEST_MODE = 'false';
    const normalClient = createLearningApiClient({
      fetchImpl,
      envSource: {
        ...process.env,
        NEXT_PUBLIC_E2E_TEST_MODE: 'false',
      },
    });
    await normalClient.listWorkspaceLearningCourses();

    const normalCalls = fetchImpl.mock.calls as unknown as [string, RequestInit | undefined][];
    const normalHeaders = normalCalls[0]?.[1]?.headers as Record<string, string>;
    expect(normalHeaders['x-tenant-id']).toBeUndefined();
    expect(normalHeaders['x-workspace-id']).toBeUndefined();

    if (originalMode === undefined) {
      delete process.env.NEXT_PUBLIC_E2E_TEST_MODE;
    } else {
      process.env.NEXT_PUBLIC_E2E_TEST_MODE = originalMode;
    }
    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage,
      configurable: true,
    });
  });

  it('gets a course with GET /workspace/learning/courses/:courseId', async () => {
    const fetchImpl = vi.fn(async () =>
      createJsonResponse(200, {
        id: 'course-1',
        title: 'API Foundations',
        slug: 'api-foundations',
        status: 'DRAFT',
        visibility: 'WORKSPACE',
        sections: [],
      }),
    );
    const client = createLearningApiClient({ fetchImpl });

    await client.getLearningCourse('course-1');

    const calls = fetchImpl.mock.calls as unknown as [string, RequestInit | undefined][];
    expect(calls[0]?.[0]).toBe('/workspace/learning/courses/course-1');
  });

  it('lists course assessment links with GET /workspace/learning/courses/:courseId/assessments', async () => {
    const fetchImpl = vi.fn(async () => createJsonResponse(200, []));
    const client = createLearningApiClient({ fetchImpl });

    await client.listCourseAssessmentLinks('course-1');

    const calls = fetchImpl.mock.calls as unknown as [string, RequestInit | undefined][];
    expect(calls[0]?.[0]).toBe('/workspace/learning/courses/course-1/assessments');
  });

  it('creates an assessment link with POST /workspace/learning/courses/:courseId/assessments', async () => {
    const fetchImpl = vi.fn(async () => createJsonResponse(201, { id: 'link-1' }));
    const client = createLearningApiClient({ fetchImpl });

    await client.createAssessmentLink('course-1', {
      assessmentId: 'assessment-1',
      lessonId: 'lesson-1',
      required: true,
      minimumScore: 80,
    });

    const calls = fetchImpl.mock.calls as unknown as [string, RequestInit | undefined][];
    expect(calls[0]?.[0]).toBe('/workspace/learning/courses/course-1/assessments');
    expect(calls[0]?.[1]?.method).toBe('POST');
    expect(JSON.parse(String(calls[0]?.[1]?.body))).toEqual({
      assessmentId: 'assessment-1',
      lessonId: 'lesson-1',
      required: true,
      minimumScore: 80,
    });
  });

  it('updates an assessment link with PATCH /workspace/learning/courses/:courseId/assessments/:linkId', async () => {
    const fetchImpl = vi.fn(async () => createJsonResponse(200, { id: 'link-1' }));
    const client = createLearningApiClient({ fetchImpl });

    await client.updateAssessmentLink('course-1', 'link-1', {
      required: false,
      minimumScore: null,
    });

    const calls = fetchImpl.mock.calls as unknown as [string, RequestInit | undefined][];
    expect(calls[0]?.[0]).toBe('/workspace/learning/courses/course-1/assessments/link-1');
    expect(calls[0]?.[1]?.method).toBe('PATCH');
  });

  it('removes an assessment link with DELETE /workspace/learning/courses/:courseId/assessments/:linkId', async () => {
    const fetchImpl = vi.fn(async () => createJsonResponse(200, { deleted: true }));
    const client = createLearningApiClient({ fetchImpl });

    await client.removeAssessmentLink('course-1', 'link-1');

    const calls = fetchImpl.mock.calls as unknown as [string, RequestInit | undefined][];
    expect(calls[0]?.[0]).toBe('/workspace/learning/courses/course-1/assessments/link-1');
    expect(calls[0]?.[1]?.method).toBe('DELETE');
  });

  it('gets learner course delivery with GET /workspace/learning/courses/:courseId/delivery', async () => {
    const fetchImpl = vi.fn(async () =>
      createJsonResponse(200, {
        course: {},
        enrollment: {},
        sections: [],
        courseLinkedAssessments: [],
        summary: {},
      }),
    );
    const client = createLearningApiClient({ fetchImpl });

    await client.getLearnerCourseDelivery('course-1');

    const calls = fetchImpl.mock.calls as unknown as [string, RequestInit | undefined][];
    expect(calls[0]?.[0]).toBe('/workspace/learning/courses/course-1/delivery');
  });

  it('gets course progress summary with GET /workspace/learning/courses/:courseId/progress-summary', async () => {
    const fetchImpl = vi.fn(async () => createJsonResponse(200, { courseId: 'course-1' }));
    const client = createLearningApiClient({ fetchImpl });

    await client.getCourseAssessmentProgressSummary('course-1');

    const calls = fetchImpl.mock.calls as unknown as [string, RequestInit | undefined][];
    expect(calls[0]?.[0]).toBe('/workspace/learning/courses/course-1/progress-summary');
  });

  it('enrolls with POST /workspace/learning/courses/:courseId/enroll', async () => {
    const fetchImpl = vi.fn(async () =>
      createJsonResponse(201, {
        id: 'enrollment-1',
        courseId: 'course-1',
        learnerPrincipalId: 'learner-1',
        status: 'ACTIVE',
        enrolledAt: '2026-05-12T00:00:00.000Z',
      }),
    );
    const client = createLearningApiClient({ fetchImpl });

    await client.enrollInLearningCourse('course-1');

    const calls = fetchImpl.mock.calls as unknown as [string, RequestInit | undefined][];
    expect(calls[0]?.[0]).toBe('/workspace/learning/courses/course-1/enroll');
    expect(JSON.parse(String(calls[0]?.[1]?.body))).toEqual({});
  });

  it('throws LearningApiError for API failures', async () => {
    const fetchImpl = vi.fn(async () =>
      createJsonResponse(409, {
        error: {
          code: 'CONFLICT',
          message: 'course is not published',
          requestId: 'req-123',
        },
      }),
    );
    const client = createLearningApiClient({ fetchImpl });

    await expect(client.enrollInLearningCourse('course-1')).rejects.toEqual(
      expect.objectContaining<Partial<LearningApiError>>({
        name: 'LearningApiError',
        message: 'course is not published',
        status: 409,
        code: 'CONFLICT',
        requestId: 'req-123',
      }),
    );
  });
});
