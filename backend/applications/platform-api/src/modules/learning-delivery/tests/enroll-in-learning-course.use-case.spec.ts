import { describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import {
  EntitlementEvaluator,
  EntitlementEvaluationResult,
  PermissionEvaluator,
  PermissionEvaluationResult,
  RequestContext,
  TransactionRunner,
  AuditRecorder,
} from '@mentrily/service-core';
import { LearningCourseRepository } from '../domain/repositories/learning-course.repository.js';
import { EnrollmentRepository } from '../domain/repositories/enrollment.repository.js';
import { LearningProgressRepository } from '../domain/repositories/learning-progress.repository.js';
import { EnrollInLearningCourseUseCase } from '../application/use-cases/enroll-in-learning-course.use-case.js';
import { LearningEventPublisherService } from '../application/services/learning-event-publisher.service.js';
import { LearningCourse } from '../domain/entities/learning-course.entity.js';
import { LearningSection } from '../domain/entities/learning-section.entity.js';
import { LearningLesson } from '../domain/entities/learning-lesson.entity.js';
import { LearningContentKind } from '../domain/value-objects/learning-content-kind.vo.js';

describe('EnrollInLearningCourseUseCase', () => {
  function makeCourse(status: 'DRAFT' | 'PUBLISHED' = 'PUBLISHED') {
    const course = LearningCourse.createDraft({
      id: randomUUID(),
      tenantId: 't1',
      workspaceId: 'w1',
      creatorPrincipalId: 'creator-1',
      title: 'Course',
      slug: 'course',
    });
    const section = new LearningSection({
      id: randomUUID(),
      courseId: course.id,
      title: 'S1',
      position: 0,
      lessons: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    section.addLesson(
      new LearningLesson({
        id: randomUUID(),
        sectionId: section.id,
        title: 'L1',
        kind: LearningContentKind.TEXT,
        position: 0,
        isRequired: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );
    course.addSection(section);
    if (status === 'PUBLISHED') course.publish();
    return course;
  }

  it('rejects unpublished course enrollment', async () => {
    const courseRepo = {
      findById: vi.fn(async () => makeCourse('DRAFT')),
    } as unknown as LearningCourseRepository;
    const enrollmentRepo = {
      findByWorkspaceCourseAndLearner: vi.fn(async () => null),
      save: vi.fn(),
    } as unknown as EnrollmentRepository;
    const progressRepo = { save: vi.fn() } as unknown as LearningProgressRepository;
    const permissionEvaluator: PermissionEvaluator = {
      evaluate: vi.fn(async () => ({ allowed: true }) as PermissionEvaluationResult),
    };
    const entitlementEvaluator: EntitlementEvaluator = {
      evaluate: vi.fn(async () => ({ enabled: true }) as EntitlementEvaluationResult),
    };
    const transactionRunner: TransactionRunner = {
      run: vi.fn(async (op) => op({ transactionId: 'tx1', client: {} })),
    };
    const auditRecorder: AuditRecorder = { record: vi.fn(async () => undefined) };
    const eventPublisher = {
      publishDomainEvent: vi.fn(async () => undefined),
    } as unknown as LearningEventPublisherService;

    const useCase = new EnrollInLearningCourseUseCase(
      courseRepo,
      enrollmentRepo,
      progressRepo,
      permissionEvaluator,
      entitlementEvaluator,
      transactionRunner,
      auditRecorder,
      eventPublisher,
    );
    const context: RequestContext = {
      requestId: 'r1',
      correlationId: 'c1',
      timestamp: new Date().toISOString(),
      workspace: { tenantId: 't1', workspaceId: 'w1', actorId: 'learner-1' },
    };

    await expect(useCase.execute(context, randomUUID(), {})).rejects.toMatchObject({
      statusCode: 409,
    });
  });
});
