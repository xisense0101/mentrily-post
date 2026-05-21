import { Inject, Injectable } from '@nestjs/common';
import {
  AppError,
  AUDIT_RECORDER,
  AuditRecorder,
  PERMISSION_EVALUATOR,
  PermissionEvaluator,
  RequestContext,
  TRANSACTION_RUNNER,
  TransactionRunner,
} from '@mentrily/service-core';
import { PermissionCatalog } from '@mentrily/security-toolkit';
import { LearningCourseRepository } from '../../domain/repositories/learning-course.repository.js';
import { PublishLearningCourseInput } from '../dto/publish-learning-course.dto.js';
import { LearningEventPublisherService } from '../services/learning-event-publisher.service.js';
import { LearningCourse } from '../../domain/entities/learning-course.entity.js';
import { coursePublished } from '../../domain/events/learning-events.js';
import { ensureCourseOwnership, requireLearningActor } from '../support/learning-context.js';

@Injectable()
export class PublishLearningCourseUseCase {
  constructor(
    @Inject(LearningCourseRepository) private readonly repo: LearningCourseRepository,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
    @Inject(TRANSACTION_RUNNER) private readonly transactionRunner: TransactionRunner,
    @Inject(AUDIT_RECORDER) private readonly auditRecorder: AuditRecorder,
    @Inject(LearningEventPublisherService)
    private readonly eventPublisher: LearningEventPublisherService,
  ) {}

  async execute(
    context: RequestContext,
    courseId: string,
    _input: PublishLearningCourseInput,
  ): Promise<LearningCourse> {
    const workspace = requireLearningActor(context);
    const perm = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.LEARNING_COURSE_PUBLISH, workspace },
      context,
    );
    if (!perm.allowed) throw new AppError('FORBIDDEN', 'permission denied', 403);

    return this.transactionRunner.run(async (tx) => {
      const course = await this.repo.findById(courseId, tx);
      if (!course) throw new AppError('NOT_FOUND', 'course not found', 404);
      ensureCourseOwnership(course, context);
      course.publish();
      const saved = await this.repo.save(course, tx);
      await this.auditRecorder.record(
        {
          action: 'learning.course.published',
          ...(workspace.actorId ? { actorId: workspace.actorId } : {}),
          targetType: 'learning.course',
          targetId: saved.id,
        },
        context,
        tx,
      );
      await this.eventPublisher.publishDomainEvent(
        coursePublished({
          tenantId: saved.tenantId,
          workspaceId: saved.workspaceId,
          courseId: saved.id,
        }),
        context,
        tx,
      );
      return saved;
    });
  }
}
