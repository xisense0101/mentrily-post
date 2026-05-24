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
import { requireLearningActor, ensureCourseOwnership } from '../support/learning-context.js';
import { UpdateLearningAssessmentLinkInput } from '../dto/update-learning-assessment-link.dto.js';
import { LearningAssessmentLinkResponse } from '../dto/learning-assessment-link-response.dto.js';
import { mapLearningAssessmentLinkToResponse } from '../mappers/learning-assessment-link-response.mapper.js';

@Injectable()
export class UpdateLearningAssessmentLinkUseCase {
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
    linkId: string,
    input: UpdateLearningAssessmentLinkInput,
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

      const link = await this.linkRepo.findById(linkId, tx);
      if (!link || link.courseId !== course.id || link.workspaceId !== workspace.workspaceId) {
        throw new AppError('NOT_FOUND', 'assessment link not found', 404);
      }

      const assessment = await this.assessmentRepo.findById(link.assessmentId, tx);
      if (!assessment) {
        throw new AppError('NOT_FOUND', 'assessment not found', 404);
      }

      if (input.required !== undefined) {
        link.updateRequired(input.required);
      }
      if (input.position !== undefined) {
        link.updatePosition(input.position);
      }
      if (input.unlockPolicy !== undefined) {
        link.updateUnlockPolicy(input.unlockPolicy);
      }
      if (input.minimumScore !== undefined) {
        link.updateMinimumScore(input.minimumScore ?? undefined);
      }

      const saved = await this.linkRepo.save(link, tx);

      await this.auditRecorder.record(
        {
          action: 'learning.assessment_link.updated',
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
