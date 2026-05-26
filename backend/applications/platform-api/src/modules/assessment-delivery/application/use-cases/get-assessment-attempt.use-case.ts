/**
 * GetAssessmentAttemptUseCase
 * Fetches a single attempt by ID with ownership verification.
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
import {
  GetLearnerAttemptProctoringUseCase,
  SyncAttemptTerminalProctoringUseCase,
} from '../../../proctoring/application/use-cases/proctoring.use-cases.js';

@Injectable()
export class GetAssessmentAttemptUseCase {
  constructor(
    @Inject(AssessmentAttemptRepository) private readonly attemptRepo: AssessmentAttemptRepository,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
    @Inject(GetLearnerAttemptProctoringUseCase)
    private readonly getAttemptProctoring?: GetLearnerAttemptProctoringUseCase,
    @Inject(SyncAttemptTerminalProctoringUseCase)
    private readonly syncTerminalProctoring?: SyncAttemptTerminalProctoringUseCase,
  ) {}

  async execute(context: RequestContext, attemptId: string): Promise<AssessmentAttemptResponse> {
    const workspace = requireAssessmentActor(context);

    const perm = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.ASSESSMENT_ATTEMPT_READ, workspace },
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
      throw new AppError('NOT_FOUND', 'attempt not found', 404);
    }

    const now = new Date();
    if (attempt.isInProgress() && attempt.isSessionExpired(now)) {
      attempt.expire();
      await this.syncTerminalProctoring?.execute(attempt.id, 'EXPIRED');
    }
    attempt.touchSession(now);
    await this.attemptRepo.save(attempt);

    const proctoring = this.getAttemptProctoring
      ? await this.getAttemptProctoring.execute(context, attempt.id)
      : undefined;
    return mapAttemptToResponse(attempt, proctoring);
  }
}
