import { randomUUID } from 'node:crypto';
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
import { MediaAssetRepository } from '../../../media-library/domain/repositories/index.js';
import { LearningCourseRepository } from '../../domain/repositories/learning-course.repository.js';
import { AddLearningLessonInput } from '../dto/add-learning-lesson.dto.js';
import { LearningEventPublisherService } from '../services/learning-event-publisher.service.js';
import { LearningCourse } from '../../domain/entities/learning-course.entity.js';
import { LearningLesson } from '../../domain/entities/learning-lesson.entity.js';
import { LearningContentKind } from '../../domain/value-objects/learning-content-kind.vo.js';
import { ensureCourseOwnership, requireLearningActor, validateLearningMediaReference } from '../support/learning-context.js';

@Injectable()
export class AddLearningLessonUseCase {
  constructor(
    @Inject(LearningCourseRepository) private readonly repo: LearningCourseRepository,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
    @Inject(TRANSACTION_RUNNER) private readonly transactionRunner: TransactionRunner,
    @Inject(AUDIT_RECORDER) private readonly auditRecorder: AuditRecorder,
    @Inject(LearningEventPublisherService)
    private readonly eventPublisher: LearningEventPublisherService,
    @Inject(MediaAssetRepository)
    private readonly mediaAssetRepo: MediaAssetRepository,
  ) {}

  async execute(
    context: RequestContext,
    courseId: string,
    sectionId: string,
    input: AddLearningLessonInput,
  ): Promise<LearningCourse> {
    const workspace = requireLearningActor(context);
    const perm = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.LEARNING_COURSE_UPDATE, workspace },
      context,
    );
    if (!perm.allowed) throw new AppError('FORBIDDEN', 'permission denied', 403);

    await validateLearningMediaReference(this.mediaAssetRepo, context, input);

    return this.transactionRunner.run(async (tx) => {
      const course = await this.repo.findById(courseId, tx);
      if (!course) throw new AppError('NOT_FOUND', 'course not found', 404);
      ensureCourseOwnership(course, context);
      const section = course.sections.find((s) => s.id === sectionId);
      if (!section) throw new AppError('NOT_FOUND', 'section not found', 404);

      section.addLesson(
        new LearningLesson({
          id: randomUUID(),
          sectionId,
          title: input.title,
          kind: input.kind as LearningContentKind,
          position: section.lessons.length,
          ...(input.estimatedMinutes !== undefined
            ? { estimatedMinutes: input.estimatedMinutes }
            : {}),
          ...(input.contentRef !== undefined ? { contentRef: input.contentRef } : {}),
          isRequired: input.isRequired ?? true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );

      const saved = await this.repo.save(course, tx);

      await this.auditRecorder.record(
        {
          action: 'learning.course.lesson_added',
          ...(workspace.actorId ? { actorId: workspace.actorId } : {}),
          targetType: 'learning.course',
          targetId: saved.id,
        },
        context,
        tx,
      );

      await this.eventPublisher.publishDomainEvent(
        {
          eventName: 'learning.course.lesson_added',
          eventVersion: 1,
          occurredAt: new Date(),
          tenantId: saved.tenantId,
          workspaceId: saved.workspaceId,
          aggregateId: saved.id,
          payload: {
            courseId: saved.id,
            sectionId,
            lessonId: section.lessons[section.lessons.length - 1]?.id ?? '',
          },
        },
        context,
        tx,
      );

      return saved;
    });
  }
}
