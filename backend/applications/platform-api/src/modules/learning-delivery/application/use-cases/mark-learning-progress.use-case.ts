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
import { LearningProgressRepository } from '../../domain/repositories/learning-progress.repository.js';
import { EnrollmentRepository } from '../../domain/repositories/enrollment.repository.js';
import { LearningCourseRepository } from '../../domain/repositories/learning-course.repository.js';
import { MarkLearningProgressInput } from '../dto/mark-learning-progress.dto.js';
import { LearningProgress } from '../../domain/entities/learning-progress.entity.js';
import { LearningProgressStatus } from '../../domain/value-objects/learning-progress-status.vo.js';
import { LearningEventPublisherService } from '../services/learning-event-publisher.service.js';
import { progressCompleted } from '../../domain/events/learning-events.js';
import {
  ensureCourseOwnership,
  ensureEnrollmentLearner,
  ensureEnrollmentOwnership,
  requireLearningActor,
} from '../support/learning-context.js';

@Injectable()
export class MarkLearningProgressUseCase {
  constructor(
    @Inject(LearningCourseRepository) private readonly courseRepo: LearningCourseRepository,
    @Inject(EnrollmentRepository) private readonly enrollmentRepo: EnrollmentRepository,
    @Inject(LearningProgressRepository) private readonly progressRepo: LearningProgressRepository,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
    @Inject(TRANSACTION_RUNNER) private readonly transactionRunner: TransactionRunner,
    @Inject(AUDIT_RECORDER) private readonly auditRecorder: AuditRecorder,
    @Inject(LearningEventPublisherService)
    private readonly eventPublisher: LearningEventPublisherService,
  ) {}

  async execute(
    context: RequestContext,
    enrollmentId: string,
    lessonId: string,
    input: MarkLearningProgressInput,
  ): Promise<LearningProgress> {
    const workspace = requireLearningActor(context);
    const perm = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.LEARNING_PROGRESS_UPDATE, workspace },
      context,
    );
    if (!perm.allowed) throw new AppError('FORBIDDEN', 'permission denied', 403);

    return this.transactionRunner.run(async (tx) => {
      const enrollment = await this.enrollmentRepo.findById(enrollmentId, tx);
      if (!enrollment) throw new AppError('NOT_FOUND', 'enrollment not found', 404);
      ensureEnrollmentOwnership(enrollment, context);
      ensureEnrollmentLearner(enrollment, context);

      const course = await this.courseRepo.findById(enrollment.courseId, tx);
      if (!course) throw new AppError('NOT_FOUND', 'course not found', 404);
      ensureCourseOwnership(course, context);

      const section = course.sections.find((s) => s.lessons.some((l) => l.id === lessonId));
      const lesson = section?.lessons.find((l) => l.id === lessonId);
      if (!lesson || !section) throw new AppError('NOT_FOUND', 'lesson not found', 404);

      let progress = await this.progressRepo.findByEnrollmentAndLesson(enrollmentId, lessonId, tx);
      if (!progress) {
        progress = LearningProgress.createNotStarted({
          id: randomUUID(),
          tenantId: enrollment.tenantId,
          workspaceId: enrollment.workspaceId,
          courseId: enrollment.courseId,
          enrollmentId,
          lessonId,
          learnerPrincipalId: enrollment.learnerPrincipalId,
        });
      }

      if (input.action === 'STARTED' || input.action === 'SEEN') progress.markSeen();
      if (input.action === 'COMPLETED') progress.markCompleted();
      if (input.action === 'RESET') progress.reset();

      const saved = await this.progressRepo.save(progress, tx);

      if (saved.status === LearningProgressStatus.COMPLETED) {
        await this.eventPublisher.publishDomainEvent(
          progressCompleted({
            tenantId: saved.tenantId,
            workspaceId: saved.workspaceId,
            progressId: saved.id,
          }),
          context,
          tx,
        );
      }

      await this.auditRecorder.record(
        {
          action: 'learning.progress.updated',
          ...(workspace.actorId ? { actorId: workspace.actorId } : {}),
          targetType: 'learning.progress',
          targetId: saved.id,
        },
        context,
        tx,
      );

      return saved;
    });
  }
}
import { randomUUID } from 'node:crypto';
