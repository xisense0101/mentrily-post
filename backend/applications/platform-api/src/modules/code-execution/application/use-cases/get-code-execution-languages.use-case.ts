import { Inject, Injectable } from '@nestjs/common';
import {
  AppError,
  PERMISSION_EVALUATOR,
  PermissionEvaluator,
  RequestContext,
} from '@mentrily/service-core';
import { PermissionCatalog } from '@mentrily/security-toolkit';
import { CodeExecutionPolicyService } from '../code-execution-policy.service.js';
import { CodeExecutionLanguageResponse } from '../dto/code-execution.dto.js';
import { requireAssessmentActor } from '../../../assessment-delivery/application/support/assessment-context.js';

@Injectable()
export class GetCodeExecutionLanguagesUseCase {
  constructor(
    @Inject(CodeExecutionPolicyService)
    private readonly policyService: CodeExecutionPolicyService,
    @Inject(PERMISSION_EVALUATOR)
    private readonly permissionEvaluator: PermissionEvaluator,
  ) {}

  async execute(context: RequestContext): Promise<CodeExecutionLanguageResponse[]> {
    const workspace = requireAssessmentActor(context);
    const perm = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.WORKSPACE_READ, workspace },
      context,
    );
    if (!perm.allowed) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }

    const languages = this.policyService.getLanguages();
    return languages.map((lang) => ({
      id: lang.id,
      displayName: lang.displayName,
      fileExtension: lang.fileExtension,
      ...(lang.defaultTemplate !== undefined ? { defaultTemplate: lang.defaultTemplate } : {}),
    }));
  }
}
