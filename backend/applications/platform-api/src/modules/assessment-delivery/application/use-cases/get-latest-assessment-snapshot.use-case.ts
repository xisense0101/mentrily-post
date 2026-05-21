import { Inject, Injectable } from '@nestjs/common';
import {
  AppError,
  PERMISSION_EVALUATOR,
  PermissionEvaluator,
  RequestContext,
} from '@mentrily/service-core';
import { PermissionCatalog } from '@mentrily/security-toolkit';
import {
  AssessmentRepository,
  AssessmentSnapshotRepository,
} from '../../domain/repositories/index.js';
import { mapSnapshotToResponse } from '../mappers/index.js';
import { AssessmentPublishedSnapshotResponse } from '../dto/index.js';
import { requireAssessmentActor } from '../support/index.js';

@Injectable()
export class GetLatestAssessmentSnapshotUseCase {
  constructor(
    @Inject(AssessmentRepository) private readonly repo: AssessmentRepository,
    @Inject(AssessmentSnapshotRepository)
    private readonly snapshotRepo: AssessmentSnapshotRepository,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
  ) {}

  async execute(
    context: RequestContext,
    assessmentId: string,
  ): Promise<AssessmentPublishedSnapshotResponse> {
    const workspace = requireAssessmentActor(context);
    const perm = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.ASSESSMENT_SNAPSHOT_READ, workspace },
      context,
    );
    if (!perm.allowed) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }

    const assessment = await this.repo.findById(assessmentId);
    if (!assessment || assessment.workspaceId !== workspace.workspaceId) {
      throw new AppError('NOT_FOUND', 'assessment not found', 404);
    }

    const snapshot = await this.snapshotRepo.findLatestByAssessmentId(assessmentId);
    if (!snapshot) {
      throw new AppError('NOT_FOUND', 'no published snapshot found for this assessment', 404);
    }

    return mapSnapshotToResponse(snapshot);
  }
}
