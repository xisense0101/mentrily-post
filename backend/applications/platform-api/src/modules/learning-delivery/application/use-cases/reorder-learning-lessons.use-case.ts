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
import { ReorderLearningLessonsInput } from '../dto/reorder-learning-lessons.dto.js';
import { LearningEventPublisherService } from '../services/learning-event-publisher.service.js';
import { LearningCourse } from '../../domain/entities/learning-course.entity.js';
import { ensureCourseOwnership, requireLearningActor } from '../support/learning-context.js';

@Injectable()
export class ReorderLearningLessonsUseCase {
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
    sectionId: string,
    input: ReorderLearningLessonsInput,
  ): Promise<LearningCourse> {
    const workspace = requireLearningActor(context);
    const perm = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.LEARNING_COURSE_UPDATE, workspace },
      context,
    );
    if (!perm.allowed) throw new AppError('FORBIDDEN', 'permission denied', 403);

    return this.transactionRunner.run(async (tx) => {
      const course = await this.repo.findById(courseId, tx);
      if (!course) throw new AppError('NOT_FOUND', 'course not found', 404);
      ensureCourseOwnership(course, context);
      const section = course.sections.find((s) => s.id === sectionId);
      if (!section) throw new AppError('NOT_FOUND', 'section not found', 404);
      section.reorderLessons(input.orderedLessonIds);
      const saved = await this.repo.save(course, tx);
      await this.auditRecorder.record(
        {
          action: 'learning.course.lessons_reordered',
          ...(workspace.actorId ? { actorId: workspace.actorId } : {}),
          targetType: 'learning.course',
          targetId: saved.id,
        },
        context,
        tx,
      );
      await this.eventPublisher.publishDomainEvent(
        {
          eventName: 'learning.course.lessons_reordered',
          eventVersion: 1,
          occurredAt: new Date(),
          tenantId: saved.tenantId,
          workspaceId: saved.workspaceId,
          aggregateId: saved.id,
          payload: { courseId: saved.id, sectionId, lessonIds: input.orderedLessonIds },
        },
        context,
        tx,
      );
      return saved;
    });
  }
}
