import { Inject, Injectable } from '@nestjs/common';
import {
  AppError,
  PERMISSION_EVALUATOR,
  PermissionEvaluator,
  RequestContext,
} from '@mentrily/service-core';
import { PermissionCatalog } from '@mentrily/security-toolkit';
import { AssessmentAttemptRepository } from '../../../assessment-delivery/domain/repositories/index.js';
import { AssessmentRepository } from '../../../assessment-delivery/domain/repositories/index.js';
import { EnrollmentRepository } from '../../domain/repositories/enrollment.repository.js';
import { LearningCourseRepository } from '../../domain/repositories/learning-course.repository.js';
import { LearningProgressRepository } from '../../domain/repositories/learning-progress.repository.js';
import { LearningAssessmentLinkRepository } from '../../domain/repositories/learning-assessment-link.repository.js';
import { CourseAssessmentProgressSummaryResponse } from '../dto/course-assessment-progress-summary.dto.js';
import { requireLearningActor, ensureCourseOwnership } from '../support/learning-context.js';
import { LearningAssessmentLinkPolicyService } from '../services/learning-assessment-link-policy.service.js';

function latestAttempt<T extends { id: string }>(attempts: T[]): T | null {
  return attempts[0] ?? null;
}

@Injectable()
export class GetCourseAssessmentProgressUseCase {
  constructor(
    @Inject(LearningCourseRepository) private readonly courseRepo: LearningCourseRepository,
    @Inject(EnrollmentRepository) private readonly enrollmentRepo: EnrollmentRepository,
    @Inject(LearningProgressRepository) private readonly progressRepo: LearningProgressRepository,
    @Inject(LearningAssessmentLinkRepository)
    private readonly linkRepo: LearningAssessmentLinkRepository,
    @Inject(AssessmentRepository) private readonly assessmentRepo: AssessmentRepository,
    @Inject(AssessmentAttemptRepository) private readonly attemptRepo: AssessmentAttemptRepository,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
    private readonly policy: LearningAssessmentLinkPolicyService,
  ) {}

  async execute(
    context: RequestContext,
    courseId: string,
  ): Promise<CourseAssessmentProgressSummaryResponse> {
    const workspace = requireLearningActor(context);
    const perm = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.LEARNING_COURSE_PROGRESS_READ, workspace },
      context,
    );
    if (!perm.allowed) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }

    const course = await this.courseRepo.findById(courseId);
    if (!course) {
      throw new AppError('NOT_FOUND', 'course not found', 404);
    }
    ensureCourseOwnership(course, context);

    const enrollments = await this.enrollmentRepo.listByCourse(course.id);
    const links = await this.linkRepo.listByCourse(course.id);

    let attemptsStarted = 0;
    let submissions = 0;
    let pendingGrading = 0;
    let resultsReleased = 0;
    let blockedRequiredAssessments = 0;
    let completedRequiredAssessments = 0;
    let satisfiedRequiredPairs = 0;
    let evaluatedRequiredPairs = 0;

    for (const enrollment of enrollments) {
      const progressRecords = await this.progressRepo.listByEnrollment(enrollment.id);
      const lessonCompletedByLessonId = new Map(
        progressRecords.map((progress) => [progress.lessonId, progress.status === 'COMPLETED']),
      );

      for (const link of links) {
        const assessment = await this.assessmentRepo.findById(link.assessmentId);
        const attempts = await this.attemptRepo.listByAssessmentAndLearner({
          assessmentId: link.assessmentId,
          learnerPrincipalId: enrollment.learnerPrincipalId,
        });
        const attempt = latestAttempt(attempts);
        const lessonCompleted = link.lessonId
          ? Boolean(lessonCompletedByLessonId.get(link.lessonId))
          : true;
        const satisfied =
          this.policy.isAssessmentPublished(assessment) &&
          this.policy.isUnlocked(link, lessonCompleted) &&
          this.policy.isRequiredAssessmentSatisfied({ link, attempt });

        if (attempt) {
          attemptsStarted += 1;
        }
        if (attempt?.status === 'SUBMITTED') {
          submissions += 1;
          if (!attempt.result?.releasedAt) {
            pendingGrading += 1;
          }
        }
        if (attempt?.result?.releasedAt) {
          resultsReleased += 1;
        }

        if (link.required) {
          evaluatedRequiredPairs += 1;
          if (satisfied) {
            satisfiedRequiredPairs += 1;
            completedRequiredAssessments += 1;
          } else {
            blockedRequiredAssessments += 1;
          }
        }
      }
    }

    const totalLinkedAssessments = links.length;
    const requiredAssessments = links.filter((link) => link.required).length;
    const learnersAssigned = enrollments.length;

    return {
      courseId: course.id,
      totalLinkedAssessments,
      requiredAssessments,
      learnersAssigned,
      attemptsStarted,
      submissions,
      pendingGrading,
      resultsReleased,
      blockedRequiredAssessments,
      completedRequiredAssessments,
      ...(evaluatedRequiredPairs > 0
        ? {
            passRate: Number(((satisfiedRequiredPairs / evaluatedRequiredPairs) * 100).toFixed(1)),
          }
        : {}),
    };
  }
}
