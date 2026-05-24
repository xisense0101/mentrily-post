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
import { EnrollmentRepository } from '../../domain/repositories/enrollment.repository.js';
import { LearningProgressRepository } from '../../domain/repositories/learning-progress.repository.js';
import { LearningCourseRepository } from '../../domain/repositories/learning-course.repository.js';
import { LearningEventPublisherService } from '../services/learning-event-publisher.service.js';
import { Enrollment } from '../../domain/entities/enrollment.entity.js';
import { enrollmentCompleted } from '../../domain/events/learning-events.js';
import {
  ensureCourseOwnership,
  ensureEnrollmentLearner,
  ensureEnrollmentOwnership,
  requireLearningActor,
} from '../support/learning-context.js';
import { LearningAssessmentLinkRepository } from '../../domain/repositories/learning-assessment-link.repository.js';
import { LearningAssessmentLinkPolicyService } from '../services/learning-assessment-link-policy.service.js';
import { AssessmentAttemptRepository } from '../../../assessment-delivery/domain/repositories/assessment-attempt.repository.js';
import { AssessmentRepository } from '../../../assessment-delivery/domain/repositories/assessment.repository.js';

@Injectable()
export class CompleteEnrollmentUseCase {
  constructor(
    @Inject(LearningCourseRepository) private readonly courseRepo: LearningCourseRepository,
    @Inject(EnrollmentRepository) private readonly enrollmentRepo: EnrollmentRepository,
    @Inject(LearningProgressRepository) private readonly progressRepo: LearningProgressRepository,
    @Inject(LearningAssessmentLinkRepository)
    private readonly linkRepo: LearningAssessmentLinkRepository,
    @Inject(LearningAssessmentLinkPolicyService)
    private readonly linkPolicy: LearningAssessmentLinkPolicyService,
    @Inject(AssessmentRepository) private readonly assessmentRepo: AssessmentRepository,
    @Inject(AssessmentAttemptRepository)
    private readonly attemptRepo: AssessmentAttemptRepository,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
    @Inject(TRANSACTION_RUNNER) private readonly transactionRunner: TransactionRunner,
    @Inject(AUDIT_RECORDER) private readonly auditRecorder: AuditRecorder,
    @Inject(LearningEventPublisherService)
    private readonly eventPublisher: LearningEventPublisherService,
  ) {}

  async execute(context: RequestContext, enrollmentId: string): Promise<Enrollment> {
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

      // Check required lessons completion
      const completedLessonIds = new Set(
        (await this.progressRepo.listCompletedByEnrollment(enrollment.id, tx)).map(
          (p) => p.lessonId,
        ),
      );
      const requiredLessonIds = course.sections.flatMap((s) =>
        s.lessons.filter((l) => l.isRequired).map((l) => l.id),
      );
      const allRequiredLessonsDone = requiredLessonIds.every((lessonId) =>
        completedLessonIds.has(lessonId),
      );
      if (!allRequiredLessonsDone)
        throw new AppError('CONFLICT', 'required lessons are not completed', 409);

      // Check required course-level linked assessments satisfaction
      const courseLinks = await this.linkRepo.listByCourse(course.id, tx);
      const requiredCourseLinks = courseLinks.filter((l) => l.lessonId === null && l.required);

      if (requiredCourseLinks.length > 0) {
        const attempts = await this.attemptRepo.listByLearner(
          {
            workspaceId: enrollment.workspaceId,
            learnerPrincipalId: enrollment.learnerPrincipalId,
          },
          tx,
        );
        const attemptsByLinkId = new Map(
          requiredCourseLinks.map((l) => [
            l.id,
            attempts.find((a) => a.assessmentId === l.assessmentId) ?? null,
          ]),
        );

        const assessmentsByLinkId = new Map<string, any>();
        for (const link of requiredCourseLinks) {
          const assessment = await this.assessmentRepo.findById(link.assessmentId, tx);
          assessmentsByLinkId.set(link.id, assessment);
        }

        const unsatisfiedLinks = requiredCourseLinks.filter((link) => {
          const attempt = attemptsByLinkId.get(link.id);
          const assessment = assessmentsByLinkId.get(link.id);
          return (
            !this.linkPolicy.isAssessmentPublished(assessment) ||
            !this.linkPolicy.isRequiredAssessmentSatisfied({ link, attempt })
          );
        });

        if (unsatisfiedLinks.length > 0) {
          throw new AppError('CONFLICT', 'required course assessments are not completed', 409);
        }
      }

      enrollment.complete();
      const saved = await this.enrollmentRepo.save(enrollment, tx);

      await this.auditRecorder.record(
        {
          action: 'learning.enrollment.completed',
          ...(workspace.actorId ? { actorId: workspace.actorId } : {}),
          targetType: 'learning.enrollment',
          targetId: saved.id,
        },
        context,
        tx,
      );
      await this.eventPublisher.publishDomainEvent(
        enrollmentCompleted({
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
