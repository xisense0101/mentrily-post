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
import { mapAssessmentGradingRunToResponse } from '../mappers/index.js';
import { AssessmentGradingRunResponse } from '../dto/index.js';
import { requireAssessmentActor } from '../support/index.js';

@Injectable()
export class GetLatestAssessmentGradingRunUseCase {
  constructor(
    @Inject(AssessmentAttemptRepository) private readonly attemptRepo: AssessmentAttemptRepository,
    @Inject(AssessmentGradingRepository) private readonly gradingRepo: AssessmentGradingRepository,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
  ) {}

  async execute(context: RequestContext, attemptId: string): Promise<AssessmentGradingRunResponse> {
    const workspace = requireAssessmentActor(context);
    const perm = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.ASSESSMENT_GRADING_READ, workspace },
      context,
    );
    if (!perm.allowed) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }

    const attempt = await this.attemptRepo.findById(attemptId);
    if (
      !attempt ||
      attempt.workspaceId !== workspace.workspaceId ||
      attempt.tenantId !== workspace.tenantId
    ) {
      throw new AppError('NOT_FOUND', 'attempt not found', 404);
    }

    const run = await this.gradingRepo.findLatestRunByAttemptId(attemptId);
    if (!run) {
      throw new AppError('NOT_FOUND', 'grading run not found', 404);
    }

    return mapAssessmentGradingRunToResponse(run);
  }
}
