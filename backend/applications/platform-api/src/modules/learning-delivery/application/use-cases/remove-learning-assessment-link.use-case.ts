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
import { LearningAssessmentLinkRepository } from '../../domain/repositories/learning-assessment-link.repository.js';
import { requireLearningActor, ensureCourseOwnership } from '../support/learning-context.js';

@Injectable()
export class RemoveLearningAssessmentLinkUseCase {
  constructor(
    @Inject(LearningCourseRepository) private readonly courseRepo: LearningCourseRepository,
    @Inject(LearningAssessmentLinkRepository)
    private readonly linkRepo: LearningAssessmentLinkRepository,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
    @Inject(TRANSACTION_RUNNER) private readonly transactionRunner: TransactionRunner,
    @Inject(AUDIT_RECORDER) private readonly auditRecorder: AuditRecorder,
  ) {}

  async execute(context: RequestContext, courseId: string, linkId: string): Promise<void> {
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

      await this.linkRepo.delete(link.id, tx);

      await this.auditRecorder.record(
        {
          action: 'learning.assessment_link.deleted',
          ...(workspace.actorId ? { actorId: workspace.actorId } : {}),
          targetType: 'learning.assessment_link',
          targetId: link.id,
        },
        context,
        tx,
      );
    });
  }
}
