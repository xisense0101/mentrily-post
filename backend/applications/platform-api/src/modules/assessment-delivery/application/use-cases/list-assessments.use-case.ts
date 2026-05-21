import { Inject, Injectable } from '@nestjs/common';
import {
  AppError,
  PERMISSION_EVALUATOR,
  PermissionEvaluator,
  RequestContext,
} from '@mentrily/service-core';
import { PermissionCatalog } from '@mentrily/security-toolkit';
import { AssessmentPurpose } from '../../domain/index.js';
import { AssessmentRepository } from '../../domain/repositories/index.js';
import { mapAssessmentToResponse } from '../mappers/index.js';
import { AssessmentResponse } from '../dto/index.js';
import { requireAssessmentActor } from '../support/index.js';

@Injectable()
export class ListAssessmentsUseCase {
  constructor(
    @Inject(AssessmentRepository) private readonly repo: AssessmentRepository,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
  ) {}

  async execute(
    context: RequestContext,
    purpose?: AssessmentPurpose,
  ): Promise<AssessmentResponse[]> {
    const workspace = requireAssessmentActor(context);
    const perm = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.ASSESSMENT_READ, workspace },
      context,
    );
    if (!perm.allowed) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }

    const assessments = purpose
      ? await this.repo.listByPurpose(workspace.workspaceId, purpose)
      : await this.repo.listByWorkspace(workspace.workspaceId);

    return assessments.map(mapAssessmentToResponse);
  }
}
