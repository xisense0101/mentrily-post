import { Inject, Injectable } from '@nestjs/common';
import {
  AppError,
  PERMISSION_EVALUATOR,
  PermissionEvaluator,
  RequestContext,
} from '@mentrily/service-core';
import { PermissionCatalog } from '@mentrily/security-toolkit';
import { ASSESSMENT_EXECUTION_PROVIDER, type AssessmentExecutionProvider } from '../ports/index.js';
import { type AssessmentExecutionResultResponse } from '../dto/index.js';
import { mapAssessmentExecutionResultToResponse } from '../mappers/index.js';
import { requireAssessmentActor } from '../support/index.js';

@Injectable()
export class GetAssessmentCodeExecutionResultUseCase {
  constructor(
    @Inject(ASSESSMENT_EXECUTION_PROVIDER)
    private readonly executionProvider: AssessmentExecutionProvider,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
  ) {}

  async execute(
    context: RequestContext,
    executionRequestId: string,
  ): Promise<AssessmentExecutionResultResponse> {
    const workspace = requireAssessmentActor(context);
    const perm = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.ASSESSMENT_EXECUTION_READ, workspace },
      context,
    );
    if (!perm.allowed) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }

    const result = await this.executionProvider.getExecutionResult(executionRequestId);
    if (!result) {
      throw new AppError('NOT_FOUND', 'execution result not found', 404);
    }

    return mapAssessmentExecutionResultToResponse(result);
  }
}
