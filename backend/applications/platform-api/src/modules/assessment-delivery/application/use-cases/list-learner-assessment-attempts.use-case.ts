/**
 * ListLearnerAssessmentAttemptsUseCase
 * Lists all attempts for the current learner in the workspace.
 */

import { Inject, Injectable } from '@nestjs/common';
import {
  AppError,
  PERMISSION_EVALUATOR,
  PermissionEvaluator,
  RequestContext,
} from '@mentrily/service-core';
import { PermissionCatalog } from '@mentrily/security-toolkit';
import { AssessmentAttemptRepository } from '../../domain/repositories/index.js';
import { mapAttemptToResponse } from '../mappers/index.js';
import { AssessmentAttemptResponse } from '../dto/index.js';
import { requireAssessmentActor } from '../support/index.js';
import { GetLearnerAttemptProctoringUseCase } from '../../../proctoring/application/use-cases/proctoring.use-cases.js';

@Injectable()
export class ListLearnerAssessmentAttemptsUseCase {
  constructor(
    @Inject(AssessmentAttemptRepository) private readonly attemptRepo: AssessmentAttemptRepository,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
    @Inject(GetLearnerAttemptProctoringUseCase)
    private readonly getAttemptProctoring?: GetLearnerAttemptProctoringUseCase,
  ) {}

  async execute(context: RequestContext): Promise<AssessmentAttemptResponse[]> {
    const workspace = requireAssessmentActor(context);

    const perm = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.ASSESSMENT_ATTEMPT_READ, workspace },
      context,
    );
    if (!perm.allowed) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }

    const attempts = await this.attemptRepo.listByLearner({
      workspaceId: workspace.workspaceId,
      learnerPrincipalId: workspace.actorId,
    });

    const proctoring = this.getAttemptProctoring
      ? await Promise.all(
          attempts.map(async (attempt) => this.getAttemptProctoring?.execute(context, attempt.id)),
        )
      : [];
    return attempts.map((attempt, index) => mapAttemptToResponse(attempt, proctoring[index]));
  }
}
