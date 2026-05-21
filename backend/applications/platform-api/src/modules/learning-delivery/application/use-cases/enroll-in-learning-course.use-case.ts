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
import { PermissionCatalog } from '@mentrily/security-toolkit';
import { EntitlementCatalog } from '../../../commercial-operations/domain/value-objects/entitlement-key.vo.js';
import { EnrollmentRepository } from '../../domain/repositories/enrollment.repository.js';
import { LearningCourseRepository } from '../../domain/repositories/learning-course.repository.js';
import { LearningProgressRepository } from '../../domain/repositories/learning-progress.repository.js';
import { EnrollInLearningCourseInput } from '../dto/enroll-in-learning-course.dto.js';
import { LearningEventPublisherService } from '../services/learning-event-publisher.service.js';
import { Enrollment } from '../../domain/entities/enrollment.entity.js';
import { LearningProgress } from '../../domain/entities/learning-progress.entity.js';
import { enrollmentCreated } from '../../domain/events/learning-events.js';
import { ensureCourseOwnership, requireLearningActor } from '../support/learning-context.js';
import { LearningCourseStatus } from '../../domain/value-objects/learning-course-status.vo.js';

@Injectable()
export class EnrollInLearningCourseUseCase {
  constructor(
    @Inject(LearningCourseRepository) private readonly courseRepo: LearningCourseRepository,
    @Inject(EnrollmentRepository) private readonly enrollmentRepo: EnrollmentRepository,
    @Inject(LearningProgressRepository) private readonly progressRepo: LearningProgressRepository,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
    @Inject(ENTITLEMENT_EVALUATOR) private readonly entitlementEvaluator: EntitlementEvaluator,
    @Inject(TRANSACTION_RUNNER) private readonly transactionRunner: TransactionRunner,
    @Inject(AUDIT_RECORDER) private readonly auditRecorder: AuditRecorder,
    @Inject(LearningEventPublisherService)
    private readonly eventPublisher: LearningEventPublisherService,
  ) {}

  async execute(
    context: RequestContext,
    courseId: string,
    _input: EnrollInLearningCourseInput,
  ): Promise<Enrollment> {
    const workspace = requireLearningActor(context);
    const actorId = workspace.actorId;
    const perm = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.LEARNING_COURSE_ENROLL, workspace },
      context,
    );
    if (!perm.allowed) throw new AppError('FORBIDDEN', 'permission denied', 403);

    const entitlement = await this.entitlementEvaluator.evaluate(
      {
        entitlementKey: EntitlementCatalog.LEARNERS_LIMIT,
        subject: { kind: 'workspace', workspaceId: workspace.workspaceId },
      },
      context,
    );
    if (!entitlement.enabled) throw new AppError('FORBIDDEN', 'entitlement denied', 403);

    return this.transactionRunner.run(async (tx) => {
      const course = await this.courseRepo.findById(courseId, tx);
      if (!course) throw new AppError('NOT_FOUND', 'course not found', 404);
      ensureCourseOwnership(course, context);
      if (course.status !== LearningCourseStatus.PUBLISHED)
        throw new AppError('CONFLICT', 'course is not published', 409);

      const existing = await this.enrollmentRepo.findByWorkspaceCourseAndLearner(
        workspace.workspaceId,
        course.id,
        actorId,
        tx,
      );
      if (existing) return existing;

      const enrollment = Enrollment.create({
        id: randomUUID(),
        tenantId: course.tenantId,
        workspaceId: course.workspaceId,
        courseId: course.id,
        learnerPrincipalId: actorId,
        enrolledAt: new Date(),
      });

      const saved = await this.enrollmentRepo.save(enrollment, tx);

      for (const section of course.sections) {
        for (const lesson of section.lessons) {
          await this.progressRepo.save(
            LearningProgress.createNotStarted({
              id: randomUUID(),
              tenantId: course.tenantId,
              workspaceId: course.workspaceId,
              courseId: course.id,
              enrollmentId: saved.id,
              lessonId: lesson.id,
              learnerPrincipalId: actorId,
            }),
            tx,
          );
        }
      }

      await this.auditRecorder.record(
        {
          action: 'learning.enrollment.created',
          ...(actorId ? { actorId } : {}),
          targetType: 'learning.enrollment',
          targetId: saved.id,
        },
        context,
        tx,
      );

      await this.eventPublisher.publishDomainEvent(
        enrollmentCreated({
          tenantId: saved.tenantId,
          workspaceId: saved.workspaceId,
          enrollmentId: saved.id,
        }),
        context,
        tx,
      );

      return saved;
    });
  }
}
