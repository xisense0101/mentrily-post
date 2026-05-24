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
import { MediaAssetRepository } from '../../../media-library/domain/repositories/index.js';
import { mapCourseToResponse } from '../mappers/learning-course-response.mapper.js';
import { mapEnrollmentToResponse } from '../mappers/learning-enrollment-response.mapper.js';
import type { LearningProgressResponse } from '../dto/learning-enrollment-response.dto.js';
import type {
  LearnerCourseDeliveryResponse,
  LearnerLinkedAssessmentResponse,
  LearnerLessonDeliveryResponse,
  LearnerSectionDeliveryResponse,
} from '../dto/learner-course-delivery-response.dto.js';
import {
  LearningAssessmentLinkPolicyService,
  type LearnerLinkedAssessmentView,
} from '../services/learning-assessment-link-policy.service.js';
import {
  requireLearningActor,
  ensureCourseOwnership,
  ensureEnrollmentLearner,
  ensureEnrollmentOwnership,
} from '../support/learning-context.js';
import { AssessmentAttempt } from '../../../assessment-delivery/domain/entities/index.js';

type AssessmentRecord = Awaited<ReturnType<AssessmentRepository['findById']>>;

function mapProgressToResponse(progress: {
  id: string;
  enrollmentId: string;
  lessonId: string;
  status: string;
  startedAt?: Date | undefined;
  completedAt?: Date | undefined;
  lastSeenAt?: Date | undefined;
}): LearningProgressResponse {
  return {
    id: progress.id,
    enrollmentId: progress.enrollmentId,
    lessonId: progress.lessonId,
    status: progress.status,
    ...(progress.startedAt ? { startedAt: progress.startedAt.toISOString() } : {}),
    ...(progress.completedAt ? { completedAt: progress.completedAt.toISOString() } : {}),
    ...(progress.lastSeenAt ? { lastSeenAt: progress.lastSeenAt.toISOString() } : {}),
  };
}

function toLearnerLinkResponse(view: LearnerLinkedAssessmentView): LearnerLinkedAssessmentResponse {
  return view;
}

function latestAttempt(attempts: AssessmentAttempt[]): AssessmentAttempt | null {
  return attempts[0] ?? null;
}

@Injectable()
export class GetLearnerCourseDeliveryUseCase {
  constructor(
    @Inject(LearningCourseRepository) private readonly courseRepo: LearningCourseRepository,
    @Inject(EnrollmentRepository) private readonly enrollmentRepo: EnrollmentRepository,
    @Inject(LearningProgressRepository) private readonly progressRepo: LearningProgressRepository,
    @Inject(LearningAssessmentLinkRepository)
    private readonly linkRepo: LearningAssessmentLinkRepository,
    @Inject(AssessmentRepository) private readonly assessmentRepo: AssessmentRepository,
    @Inject(AssessmentAttemptRepository) private readonly attemptRepo: AssessmentAttemptRepository,
    @Inject(MediaAssetRepository) private readonly mediaAssetRepo: MediaAssetRepository,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
    @Inject(LearningAssessmentLinkPolicyService)
    private readonly policy: LearningAssessmentLinkPolicyService,
  ) {}

  async execute(context: RequestContext, courseId: string): Promise<LearnerCourseDeliveryResponse> {
    const workspace = requireLearningActor(context);
    const perm = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.LEARNING_COURSE_DELIVERY_READ, workspace },
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

    const enrollment = await this.enrollmentRepo.findByWorkspaceCourseAndLearner(
      workspace.workspaceId,
      course.id,
      workspace.actorId,
    );
    if (!enrollment) {
      throw new AppError('NOT_FOUND', 'enrollment not found', 404);
    }
    ensureEnrollmentOwnership(enrollment, context);
    ensureEnrollmentLearner(enrollment, context);

    const progressRecords = await this.progressRepo.listByEnrollment(enrollment.id);
    const progressByLessonId = new Map(
      progressRecords.map((progress) => [progress.lessonId, progress]),
    );
    const lessonProgressCompletedByLessonId = new Map(
      progressRecords.map((progress) => [progress.lessonId, progress.status === 'COMPLETED']),
    );

    const links = await this.linkRepo.listByCourse(course.id);
    const assessmentsById = new Map<string, AssessmentRecord>();
    const attemptsByLinkId = new Map<string, AssessmentAttempt | null>();

    for (const link of links) {
      const assessment = await this.assessmentRepo.findById(link.assessmentId);
      assessmentsById.set(link.assessmentId, assessment);
      const attempts = await this.attemptRepo.listByAssessmentAndLearner({
        assessmentId: link.assessmentId,
        learnerPrincipalId: workspace.actorId,
      });
      attemptsByLinkId.set(link.id, latestAttempt(attempts));
    }

    const courseResponse = await mapCourseToResponse(course, this.mediaAssetRepo);
    const courseLinkedAssessments = links
      .filter((link) => !link.lessonId)
      .map((link) =>
        toLearnerLinkResponse(
          this.policy.toLearnerView({
            link,
            assessment: assessmentsById.get(link.assessmentId) ?? null,
            attempt: attemptsByLinkId.get(link.id) ?? null,
            lessonProgressCompleted: true,
          }),
        ),
      );

    const sections: LearnerSectionDeliveryResponse[] = courseResponse.sections.map((section) => ({
      ...section,
      lessons: section.lessons.map((lesson): LearnerLessonDeliveryResponse => {
        const progress = progressByLessonId.get(lesson.id);
        const linkedAssessments = links
          .filter((link) => link.lessonId === lesson.id)
          .map((link) =>
            toLearnerLinkResponse(
              this.policy.toLearnerView({
                link,
                assessment: assessmentsById.get(link.assessmentId) ?? null,
                attempt: attemptsByLinkId.get(link.id) ?? null,
                lessonProgressCompleted: progress?.status === 'COMPLETED',
              }),
            ),
          );

        return {
          ...lesson,
          ...(progress ? { progress: mapProgressToResponse(progress) } : {}),
          linkedAssessments,
        };
      }),
    }));

    const summary = this.policy.summarize({
      links,
      attemptsByLinkId,
      lessonProgressCompletedByLessonId,
      assessmentById: assessmentsById,
    });

    return {
      course: courseResponse,
      enrollment: mapEnrollmentToResponse(enrollment),
      sections,
      courseLinkedAssessments,
      summary,
    };
  }
}
