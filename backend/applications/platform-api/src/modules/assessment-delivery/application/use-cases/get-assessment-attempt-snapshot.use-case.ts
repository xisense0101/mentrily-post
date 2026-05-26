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
  AssessmentSnapshotRepository,
} from '../../domain/repositories/index.js';
import { AssessmentPublishedSnapshotResponse } from '../dto/index.js';
import { mapSnapshotToResponse } from '../mappers/assessment-snapshot-response.mapper.js';
import { requireAssessmentActor } from '../support/index.js';

@Injectable()
export class GetAssessmentAttemptSnapshotUseCase {
  constructor(
    @Inject(AssessmentAttemptRepository) private readonly attemptRepo: AssessmentAttemptRepository,
    @Inject(AssessmentSnapshotRepository)
    private readonly snapshotRepo: AssessmentSnapshotRepository,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
  ) {}

  async execute(
    context: RequestContext,
    attemptId: string,
  ): Promise<AssessmentPublishedSnapshotResponse> {
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
      attempt.tenantId !== workspace.tenantId
    ) {
      throw new AppError('NOT_FOUND', 'attempt not found', 404);
    }

    // Ensure actor owns the attempt unless permission allowed broader read
    if (attempt.learnerPrincipalId !== workspace.actorId) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }

    const snapshot = await this.snapshotRepo.findById(attempt.snapshotId);
    if (!snapshot || snapshot.assessmentId !== attempt.assessmentId) {
      throw new AppError('NOT_FOUND', 'snapshot not found', 404);
    }

    const now = new Date();
    if (attempt.isInProgress() && attempt.isSessionExpired(now)) {
      attempt.expire();
    }
    attempt.touchSession(now);
    await this.attemptRepo.save(attempt);

    return mapSnapshotToResponse(snapshot);
  }
}
