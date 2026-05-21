import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import {
  AppError,
  AUDIT_RECORDER,
  AuditRecorder,
  ENTITLEMENT_EVALUATOR,
  EntitlementEvaluator,
  PERMISSION_EVALUATOR,
  PermissionEvaluator,
  RequestContext,
  TRANSACTION_RUNNER,
  TransactionRunner,
} from '@mentrily/service-core';
import { EntitlementCatalog } from '../../../commercial-operations/domain/value-objects/entitlement-key.vo.js';
import { LearningCourseRepository } from '../../domain/repositories/learning-course.repository.js';
import { CreateLearningCourseInput } from '../dto/create-learning-course.dto.js';
import { LearningEventPublisherService } from '../services/learning-event-publisher.service.js';
import { LearningCourse } from '../../domain/entities/learning-course.entity.js';
import { PermissionCatalog } from '@mentrily/security-toolkit';
import { courseCreated } from '../../domain/events/learning-events.js';

@Injectable()
export class CreateLearningCourseUseCase {
  constructor(
    @Inject(LearningCourseRepository) private readonly repo: LearningCourseRepository,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
    @Inject(ENTITLEMENT_EVALUATOR) private readonly entitlementEvaluator: EntitlementEvaluator,
    @Inject(TRANSACTION_RUNNER) private readonly transactionRunner: TransactionRunner,
    @Inject(AUDIT_RECORDER) private readonly auditRecorder: AuditRecorder,
    @Inject(LearningEventPublisherService)
    private readonly eventPublisher: LearningEventPublisherService,
  ) {}

  async execute(
    context: RequestContext,
    input: CreateLearningCourseInput,
  ): Promise<LearningCourse> {
    const workspace = context.workspace;
    if (!workspace) throw new AppError('VALIDATION_ERROR', 'missing workspace context', 400);
    if (!workspace.actorId) throw new AppError('UNAUTHORIZED', 'missing actor', 401);
    const actorId = workspace.actorId;

    const perm = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.LEARNING_COURSE_CREATE, workspace },
      context,
    );
    if (!perm.allowed) throw new AppError('FORBIDDEN', 'permission denied', 403);

    const ent = await this.entitlementEvaluator.evaluate(
      {
        entitlementKey: EntitlementCatalog.COURSES_LIMIT,
        subject: { kind: 'workspace', workspaceId: workspace.workspaceId },
      },
      context,
    );
    if (!ent.enabled) throw new AppError('FORBIDDEN', 'entitlement denied', 403);

    return this.transactionRunner.run(async (tx) => {
      const id = randomUUID();
      const course = LearningCourse.createDraft({
        id,
        tenantId: workspace.tenantId,
        workspaceId: workspace.workspaceId,
        creatorPrincipalId: actorId,
        title: input.title,
        slug: input.slug,
        ...(input.description !== undefined ? { description: input.description } : {}),
      });

      const saved = await this.repo.save(course, tx);

      await this.auditRecorder.record(
        {
          action: 'learning.course.created',
          ...(actorId ? { actorId } : {}),
          targetType: 'learning.course',
          targetId: saved.id,
        },
        context,
        tx,
      );

      await this.eventPublisher.publishDomainEvent(
        courseCreated({
          tenantId: saved.tenantId,
          workspaceId: saved.workspaceId,
          courseId: saved.id,
          title: saved.title,
          creatorPrincipalId: saved.creatorPrincipalId,
        }),
        context,
        tx,
      );

      return saved;
    });
  }
}
