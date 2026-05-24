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
import { AssessmentRepository } from '../../../assessment-delivery/domain/repositories/index.js';
import { LearningCourseRepository } from '../../domain/repositories/learning-course.repository.js';
import { LearningAssessmentLinkRepository } from '../../domain/repositories/learning-assessment-link.repository.js';
import { LearningAssessmentLink } from '../../domain/entities/learning-assessment-link.entity.js';
import { requireLearningActor, ensureCourseOwnership } from '../support/learning-context.js';
import { CreateLearningAssessmentLinkInput } from '../dto/create-learning-assessment-link.dto.js';
import { LearningAssessmentLinkResponse } from '../dto/learning-assessment-link-response.dto.js';
import { mapLearningAssessmentLinkToResponse } from '../mappers/learning-assessment-link-response.mapper.js';

@Injectable()
export class CreateLearningAssessmentLinkUseCase {
  constructor(
    @Inject(LearningCourseRepository) private readonly courseRepo: LearningCourseRepository,
    @Inject(LearningAssessmentLinkRepository)
    private readonly linkRepo: LearningAssessmentLinkRepository,
    @Inject(AssessmentRepository) private readonly assessmentRepo: AssessmentRepository,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
    @Inject(TRANSACTION_RUNNER) private readonly transactionRunner: TransactionRunner,
    @Inject(AUDIT_RECORDER) private readonly auditRecorder: AuditRecorder,
  ) {}

  async execute(
    context: RequestContext,
    courseId: string,
    input: CreateLearningAssessmentLinkInput & {
      sectionId?: string | undefined;
      lessonId?: string | undefined;
    },
  ): Promise<LearningAssessmentLinkResponse> {
    const workspace = requireLearningActor(context);
    const perm = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.LEARNING_ASSESSMENT_LINK_MANAGE, workspace },
      context,
    );
    if (!perm.allowed) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }

    return this.transactionRunner.run(async (tx) => {
      const course = await this.courseRepo.findById(courseId, tx);
      if (!course) {
        throw new AppError('NOT_FOUND', 'course not found', 404);
      }
      ensureCourseOwnership(course, context);

      const assessment = await this.assessmentRepo.findById(input.assessmentId, tx);
      if (
        !assessment ||
        assessment.workspaceId !== workspace.workspaceId ||
        assessment.tenantId !== workspace.tenantId
      ) {
        throw new AppError('NOT_FOUND', 'assessment not found', 404);
      }

      const resolvedLesson =
        input.lessonId !== undefined
          ? course.sections
              .flatMap((section) =>
                section.lessons.map((lesson) => ({ sectionId: section.id, lesson })),
              )
              .find(
                (candidate) =>
                  candidate.lesson.id === input.lessonId &&
                  (input.sectionId === undefined || candidate.sectionId === input.sectionId),
              )
          : undefined;

      if (input.lessonId !== undefined && !resolvedLesson) {
        throw new AppError('NOT_FOUND', 'lesson not found', 404);
      }

      if (input.sectionId !== undefined && input.lessonId === undefined) {
        throw new AppError(
          'VALIDATION_ERROR',
          'section-level assessment links are not supported',
          400,
        );
      }

      const existingLink = await this.linkRepo.findByCourseAndAssessment(
        {
          courseId: course.id,
          assessmentId: input.assessmentId,
          ...(input.lessonId !== undefined ? { lessonId: input.lessonId } : {}),
        },
        tx,
      );
      if (existingLink) {
        throw new AppError('CONFLICT', 'assessment already linked to this scope', 409);
      }

      const scopedLinks = input.lessonId
        ? await this.linkRepo.listByLesson(input.lessonId, tx)
        : (await this.linkRepo.listByCourse(course.id, tx)).filter((link) => !link.lessonId);
      const nextPosition =
        input.position ??
        (scopedLinks.length > 0 ? Math.max(...scopedLinks.map((link) => link.position)) + 1 : 0);

      const link = LearningAssessmentLink.createDraft({
        id: randomUUID(),
        tenantId: course.tenantId,
        workspaceId: course.workspaceId,
        courseId: course.id,
        ...(resolvedLesson
          ? { sectionId: resolvedLesson.sectionId, lessonId: resolvedLesson.lesson.id }
          : input.sectionId !== undefined
            ? { sectionId: input.sectionId }
            : {}),
        assessmentId: assessment.id,
        required: input.required ?? true,
        position: nextPosition,
        unlockPolicy: input.unlockPolicy ?? 'IMMEDIATE',
        ...(input.minimumScore !== undefined ? { minimumScore: input.minimumScore } : {}),
        createdByPrincipalId: workspace.actorId,
      });

      const saved = await this.linkRepo.save(link, tx);

      await this.auditRecorder.record(
        {
          action: 'learning.assessment_link.created',
          ...(workspace.actorId ? { actorId: workspace.actorId } : {}),
          targetType: 'learning.assessment_link',
          targetId: saved.id,
        },
        context,
        tx,
      );

      return mapLearningAssessmentLinkToResponse(saved, assessment);
    });
  }
}
