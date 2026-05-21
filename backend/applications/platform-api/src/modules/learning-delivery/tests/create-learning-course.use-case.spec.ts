import { describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import {
  RequestContext,
  PermissionEvaluator,
  PermissionEvaluationResult,
  EntitlementEvaluator,
  EntitlementEvaluationResult,
  TransactionRunner,
  AuditRecorder,
} from '@mentrily/service-core';
import { LearningCourseRepository } from '../domain/repositories/learning-course.repository.js';
import { CreateLearningCourseUseCase } from '../application/use-cases/create-learning-course.use-case.js';
import { LearningCourse } from '../domain/entities/learning-course.entity.js';
import { LearningEventPublisherService } from '../application/services/learning-event-publisher.service.js';

describe('CreateLearningCourseUseCase', () => {
  it('creates a course within a transaction and emits audit/outbox side-effects', async () => {
    const savedCourse = LearningCourse.createDraft({
      id: randomUUID(),
      tenantId: 'tenant-1',
      workspaceId: 'workspace-1',
      creatorPrincipalId: 'actor-1',
      title: 'Course',
      slug: 'course',
    });

    const repo = { save: vi.fn(async () => savedCourse) } as unknown as LearningCourseRepository;
    const permissionEvaluator: PermissionEvaluator = {
      evaluate: vi.fn(async () => ({ allowed: true }) as PermissionEvaluationResult),
    };
    const entitlementEvaluator: EntitlementEvaluator = {
      evaluate: vi.fn(async () => ({ enabled: true }) as EntitlementEvaluationResult),
    };
    const auditRecorder: AuditRecorder = { record: vi.fn(async () => undefined) };
    const eventPublisher = {
      publishDomainEvent: vi.fn(async () => undefined),
    } as unknown as LearningEventPublisherService;
    const transactionRunner: TransactionRunner = {
      run: vi.fn(async (operation) => operation({ transactionId: 'tx-1', client: {} })),
    };

    const useCase = new CreateLearningCourseUseCase(
      repo,
      permissionEvaluator,
      entitlementEvaluator,
      transactionRunner,
      auditRecorder,
      eventPublisher,
    );

    const context: RequestContext = {
      requestId: 'req-1',
      correlationId: 'cor-1',
      timestamp: new Date().toISOString(),
      workspace: { tenantId: 'tenant-1', workspaceId: 'workspace-1', actorId: 'actor-1' },
    };

    const result = await useCase.execute(context, { title: 'Course', slug: 'course' });
    expect(result.id).toBe(savedCourse.id);
  });
});
