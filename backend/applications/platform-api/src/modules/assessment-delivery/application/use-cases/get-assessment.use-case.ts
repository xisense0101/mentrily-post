import { Inject, Injectable } from '@nestjs/common';
import {
  AppError,
  PERMISSION_EVALUATOR,
  PermissionEvaluator,
  RequestContext,
} from '@mentrily/service-core';
import { PermissionCatalog } from '@mentrily/security-toolkit';
import { AssessmentRepository } from '../../domain/repositories/index.js';
import { mapAssessmentToResponse } from '../mappers/index.js';
import { AssessmentResponse } from '../dto/index.js';
import { requireAssessmentActor } from '../support/index.js';

@Injectable()
export class GetAssessmentUseCase {
  constructor(
    @Inject(AssessmentRepository) private readonly repo: AssessmentRepository,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
  ) {}

  async execute(context: RequestContext, assessmentId: string): Promise<AssessmentResponse> {
    const workspace = requireAssessmentActor(context);
    const perm = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.ASSESSMENT_READ, workspace },
      context,
    );
    if (!perm.allowed) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }

    const assessment = await this.repo.findById(assessmentId);
    if (!assessment || assessment.workspaceId !== workspace.workspaceId) {
      throw new AppError('NOT_FOUND', 'assessment not found', 404);
    }

    return mapAssessmentToResponse(assessment);
  }
}
