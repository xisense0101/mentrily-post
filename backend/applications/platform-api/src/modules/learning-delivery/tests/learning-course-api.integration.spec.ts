import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { PrismaService } from '@mentrily/data-platform';
import { createRequestContextFromHeaders } from '@mentrily/service-core';
import { truncatePublicSchema } from '@mentrily/testing-toolkit';
import { CreateLearningCourseUseCase } from '../application/use-cases/create-learning-course.use-case.js';
import { GetLearningCourseUseCase } from '../application/use-cases/get-learning-course.use-case.js';
import { ListWorkspaceLearningCoursesUseCase } from '../application/use-cases/list-workspace-learning-courses.use-case.js';
import type { CreateLearningCourseInput } from '../application/dto/create-learning-course.dto.js';
import { createLearningApiTestApp } from './learning-api-test-app.js';

describe('Learning Delivery API (integration)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;

  const baseHeaders = {
    'x-request-id': '66666666-6666-4666-8666-666666666666',
    'x-correlation-id': '77777777-7777-4777-8777-777777777777',
    'x-tenant-id': '11111111-1111-4111-8111-111111111111',
    'x-workspace-id': '22222222-2222-4222-8222-222222222222',
    'x-actor-id': '33333333-3333-4333-8333-333333333333',
  } as const;

  type ApiHeaders = {
    readonly 'x-request-id': string;
    readonly 'x-correlation-id': string;
    readonly 'x-tenant-id': string;
    readonly 'x-workspace-id': string;
    readonly 'x-actor-id': string;
  };

  function expectHttpStatus(
    response: { statusCode: number; body: string },
    expected: number,
  ): void {
    if (response.statusCode !== expected) {
      throw new Error(
        `Expected HTTP ${expected} but received ${response.statusCode}. Body: ${response.body}`,
      );
    }
  }

  function contextFromHeaders(
    headers: ApiHeaders,
  ): ReturnType<typeof createRequestContextFromHeaders> {
    return createRequestContextFromHeaders({
      requestIdHeader: headers['x-request-id'],
      correlationIdHeader: headers['x-correlation-id'],
      tenantIdHeader: headers['x-tenant-id'],
      workspaceIdHeader: headers['x-workspace-id'],
      actorIdHeader: headers['x-actor-id'],
    });
  }

  async function expectCreateCourseStatus(
    response: { statusCode: number; body: string },
    expected: number,
    payload: CreateLearningCourseInput,
    headers: ApiHeaders,
  ): Promise<void> {
    if (response.statusCode === expected) {
      return;
    }

    try {
      const useCase = app.get(CreateLearningCourseUseCase);
      await useCase.execute(contextFromHeaders(headers), payload);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(
          `Expected HTTP ${expected} but received ${response.statusCode}. Body: ${response.body}. Direct create-course error: ${error.stack ?? error.message}`,
        );
      }

      throw new Error(
        `Expected HTTP ${expected} but received ${response.statusCode}. Body: ${response.body}. Direct create-course error: ${String(error)}`,
      );
    }

    expectHttpStatus(response, expected);
  }

  async function expectListCoursesStatus(
    response: { statusCode: number; body: string },
    expected: number,
    headers: ApiHeaders,
  ): Promise<void> {
    if (response.statusCode === expected) {
      return;
    }

    try {
      const useCase = app.get(ListWorkspaceLearningCoursesUseCase);
      await useCase.execute(contextFromHeaders(headers));
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(
          `Expected HTTP ${expected} but received ${response.statusCode}. Body: ${response.body}. Direct list-courses error: ${error.stack ?? error.message}`,
        );
      }

      throw new Error(
        `Expected HTTP ${expected} but received ${response.statusCode}. Body: ${response.body}. Direct list-courses error: ${String(error)}`,
      );
    }

    expectHttpStatus(response, expected);
  }

  async function expectGetCourseStatus(
    response: { statusCode: number; body: string },
    expected: number,
    headers: ApiHeaders,
    courseId: string,
  ): Promise<void> {
    if (response.statusCode === expected) {
      return;
    }

    try {
      const useCase = app.get(GetLearningCourseUseCase);
      await useCase.execute(contextFromHeaders(headers), courseId);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(
          `Expected HTTP ${expected} but received ${response.statusCode}. Body: ${response.body}. Direct get-course error: ${error.stack ?? error.message}`,
        );
      }

      throw new Error(
        `Expected HTTP ${expected} but received ${response.statusCode}. Body: ${response.body}. Direct get-course error: ${String(error)}`,
      );
    }

    expectHttpStatus(response, expected);
  }

  beforeAll(async () => {
    app = await createLearningApiTestApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await truncatePublicSchema(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('creator can create/list/read/add-section/add-lesson/publish and learner can enroll/progress/complete', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/workspace/learning/courses',
      headers: baseHeaders,
      payload: { title: 'API Course', slug: 'api-course' },
    });
    await expectCreateCourseStatus(
      createRes,
      201,
      { title: 'API Course', slug: 'api-course' },
      baseHeaders,
    );
    const created = createRes.json();

    const listRes = await app.inject({
      method: 'GET',
      url: '/workspace/learning/courses',
      headers: baseHeaders,
    });
    await expectListCoursesStatus(listRes, 200, baseHeaders);
    expect(listRes.json()).toHaveLength(1);

    const getRes = await app.inject({
      method: 'GET',
      url: `/workspace/learning/courses/${created.id}`,
      headers: baseHeaders,
    });
    await expectGetCourseStatus(getRes, 200, baseHeaders, created.id as string);

    const sectionRes = await app.inject({
      method: 'POST',
      url: `/workspace/learning/courses/${created.id}/sections`,
      headers: baseHeaders,
      payload: { title: 'Section 1' },
    });
    expectHttpStatus(sectionRes, 201);
    const sectionId = sectionRes.json().sections[0].id as string;

    const lessonRes = await app.inject({
      method: 'POST',
      url: `/workspace/learning/courses/${created.id}/sections/${sectionId}/lessons`,
      headers: baseHeaders,
      payload: { title: 'Lesson 1', kind: 'TEXT', isRequired: true },
    });
    expectHttpStatus(lessonRes, 201);
    const lessonId = lessonRes.json().sections[0].lessons[0].id as string;

    const learnerHeaders = {
      ...baseHeaders,
      'x-actor-id': '44444444-4444-4444-8444-444444444444',
    };

    const draftEnroll = await app.inject({
      method: 'POST',
      url: `/workspace/learning/courses/${created.id}/enroll`,
      headers: learnerHeaders,
      payload: {},
    });
    expectHttpStatus(draftEnroll, 409);

    const publishRes = await app.inject({
      method: 'POST',
      url: `/workspace/learning/courses/${created.id}/publish`,
      headers: baseHeaders,
      payload: {},
    });
    expectHttpStatus(publishRes, 201);

    const enrollRes = await app.inject({
      method: 'POST',
      url: `/workspace/learning/courses/${created.id}/enroll`,
      headers: learnerHeaders,
      payload: {},
    });
    expectHttpStatus(enrollRes, 201);
    const enrollmentId = enrollRes.json().id as string;

    const listEnrollRes = await app.inject({
      method: 'GET',
      url: '/workspace/learning/enrollments',
      headers: learnerHeaders,
    });
    expectHttpStatus(listEnrollRes, 200);
    expect(listEnrollRes.json()).toHaveLength(1);

    const completeBefore = await app.inject({
      method: 'POST',
      url: `/workspace/learning/enrollments/${enrollmentId}/complete`,
      headers: learnerHeaders,
    });
    expectHttpStatus(completeBefore, 409);

    const progressRes = await app.inject({
      method: 'POST',
      url: `/workspace/learning/enrollments/${enrollmentId}/progress/${lessonId}`,
      headers: learnerHeaders,
      payload: { action: 'COMPLETED' },
    });
    expectHttpStatus(progressRes, 201);

    const completeAfter = await app.inject({
      method: 'POST',
      url: `/workspace/learning/enrollments/${enrollmentId}/complete`,
      headers: learnerHeaders,
    });
    expectHttpStatus(completeAfter, 201);
  });

  it('missing workspace context fails and cross-workspace access returns not found', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/workspace/learning/courses',
      headers: baseHeaders,
      payload: { title: 'Tenant Course', slug: 'tenant-course' },
    });
    await expectCreateCourseStatus(
      createRes,
      201,
      { title: 'Tenant Course', slug: 'tenant-course' },
      baseHeaders,
    );
    const courseId = createRes.json().id as string;

    const missingCtx = await app.inject({
      method: 'GET',
      url: '/workspace/learning/courses',
      headers: {
        'x-request-id': '88888888-8888-4888-8888-888888888888',
        'x-correlation-id': '99999999-9999-4999-8999-999999999999',
      },
    });
    expectHttpStatus(missingCtx, 400);

    const crossGet = await app.inject({
      method: 'GET',
      url: `/workspace/learning/courses/${courseId}`,
      headers: {
        ...baseHeaders,
        'x-workspace-id': '55555555-5555-4555-8555-555555555555',
      },
    });
    await expectGetCourseStatus(
      crossGet,
      404,
      {
        ...baseHeaders,
        'x-workspace-id': '55555555-5555-4555-8555-555555555555',
      },
      courseId,
    );

    const crossMutate = await app.inject({
      method: 'POST',
      url: `/workspace/learning/courses/${courseId}/publish`,
      headers: {
        ...baseHeaders,
        'x-workspace-id': '55555555-5555-4555-8555-555555555555',
      },
      payload: {},
    });
    expectHttpStatus(crossMutate, 404);
  });

  it('creator fails to add a lesson with an invalid video media asset reference', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/workspace/learning/courses',
      headers: baseHeaders,
      payload: { title: 'Media API Course', slug: 'media-api-course' },
    });
    expectHttpStatus(createRes, 201);
    const courseId = createRes.json().id;

    const sectionRes = await app.inject({
      method: 'POST',
      url: `/workspace/learning/courses/${courseId}/sections`,
      headers: baseHeaders,
      payload: { title: 'Section 1' },
    });
    expectHttpStatus(sectionRes, 201);
    const sectionId = sectionRes.json().sections[0].id;

    const lessonRes = await app.inject({
      method: 'POST',
      url: `/workspace/learning/courses/${courseId}/sections/${sectionId}/lessons`,
      headers: baseHeaders,
      payload: { title: 'Lesson 1', kind: 'VIDEO', contentRef: '11111111-1111-4111-8111-111111111111', isRequired: true },
    });
    expectHttpStatus(lessonRes, 400);
    expect(lessonRes.json().error.message).toContain('referenced media asset not found');
  });

  it('creator succeeds to add a lesson with a valid video media asset reference', async () => {
    const assetId = '77777777-7777-4777-8777-777777777777';
    await prisma.mediaAsset.create({
      data: {
        id: assetId,
        tenantId: baseHeaders['x-tenant-id'],
        workspaceId: baseHeaders['x-workspace-id'],
        ownerPrincipalId: baseHeaders['x-actor-id'],
        filename: 'video.mp4',
        contentType: 'video/mp4',
        fileCategory: 'VIDEO',
        storageProvider: 'FIXTURE',
        objectKey: `tenants/${baseHeaders['x-tenant-id']}/workspaces/${baseHeaders['x-workspace-id']}/media/test-key-video`,
        visibility: 'PRIVATE',
        status: 'AVAILABLE',
        scanStatus: 'CLEAN',
        metadata: {},
      },
    });

    const createRes = await app.inject({
      method: 'POST',
      url: '/workspace/learning/courses',
      headers: baseHeaders,
      payload: { title: 'Media API Course Success', slug: 'media-api-course-success' },
    });
    expectHttpStatus(createRes, 201);
    const courseId = createRes.json().id;

    const sectionRes = await app.inject({
      method: 'POST',
      url: `/workspace/learning/courses/${courseId}/sections`,
      headers: baseHeaders,
      payload: { title: 'Section 1' },
    });
    expectHttpStatus(sectionRes, 201);
    const sectionId = sectionRes.json().sections[0].id;

    const lessonRes = await app.inject({
      method: 'POST',
      url: `/workspace/learning/courses/${courseId}/sections/${sectionId}/lessons`,
      headers: baseHeaders,
      payload: { title: 'Lesson 1', kind: 'VIDEO', contentRef: assetId, isRequired: true },
    });
    expectHttpStatus(lessonRes, 201);
  });
});
