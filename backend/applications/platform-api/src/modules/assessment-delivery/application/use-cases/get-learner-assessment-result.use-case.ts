import { Inject, Injectable } from '@nestjs/common';
import {
  AppError,
  PERMISSION_EVALUATOR,
  PermissionEvaluator,
  RequestContext,
} from '@mentrily/service-core';
import { PermissionCatalog } from '@mentrily/security-toolkit';
import {
  AssessmentAttemptRepository,
  AssessmentGradingRepository,
} from '../../domain/repositories/index.js';
import { AssessmentResultReleasePolicyService } from '../../domain/services/index.js';
import { mapLearnerAssessmentResultToResponse } from '../mappers/index.js';
import { type AssessmentLearnerResultResponse } from '../dto/index.js';
import { requireAssessmentActor } from '../support/index.js';

@Injectable()
export class GetLearnerAssessmentResultUseCase {
  constructor(
    @Inject(AssessmentAttemptRepository) private readonly attemptRepo: AssessmentAttemptRepository,
    @Inject(AssessmentGradingRepository) private readonly gradingRepo: AssessmentGradingRepository,
    @Inject(AssessmentResultReleasePolicyService)
    private readonly releasePolicy: AssessmentResultReleasePolicyService,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
  ) {}

  async execute(
    context: RequestContext,
    attemptId: string,
  ): Promise<AssessmentLearnerResultResponse> {
    const workspace = requireAssessmentActor(context);
    const perm = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.ASSESSMENT_RESULT_READ_OWN, workspace },
      context,
    );
    if (!perm.allowed) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }

    const attempt = await this.attemptRepo.findById(attemptId);
    if (
      !attempt ||
      attempt.workspaceId !== workspace.workspaceId ||
      attempt.tenantId !== workspace.tenantId ||
      attempt.learnerPrincipalId !== workspace.actorId
    ) {
      throw new AppError('NOT_FOUND', 'attempt result not found', 404);
    }
    if (!attempt.result) {
      throw new AppError('NOT_FOUND', 'attempt result not found', 404);
    }

    const decision = this.releasePolicy.canLearnerViewResult({
      attemptStatus: attempt.status,
      gradingStatus: attempt.result.gradingStatus,
      ...(attempt.result.releasedAt !== undefined ? { releasedAt: attempt.result.releasedAt } : {}),
    });
    if (!decision.allowed) {
      throw new AppError('FORBIDDEN', decision.reason ?? 'result not available', 403);
    }

    const latestRun = await this.gradingRepo.findLatestRunByAttemptId(attempt.id);
    return mapLearnerAssessmentResultToResponse(attempt, latestRun ?? undefined);
  }
}
