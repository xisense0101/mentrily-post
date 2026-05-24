import { Inject, Injectable } from '@nestjs/common';
import {
  AppError,
  PERMISSION_EVALUATOR,
  type PermissionEvaluator,
  type RequestContext,
} from '@mentrily/service-core';
import { PermissionCatalog } from '@mentrily/security-toolkit';
import { CampaignAudienceResolver } from '../services/campaign-audience-resolver.service.js';
import type {
  CampaignAudiencePreviewResponseContract,
  CampaignAudiencePreviewRequestContract,
} from '@mentrily/contract-catalog';

@Injectable()
export class PreviewCampaignAudienceUseCase {
  constructor(
    @Inject(CampaignAudienceResolver)
    private readonly resolver: CampaignAudienceResolver,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
  ) {}

  async execute(
    context: RequestContext,
    input: CampaignAudiencePreviewRequestContract,
  ): Promise<CampaignAudiencePreviewResponseContract> {
    const workspace = context.workspace;
    if (!workspace) {
      throw new AppError('VALIDATION_ERROR', 'missing workspace context', 400);
    }

    const permission = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.CAMPAIGN_READ, workspace },
      context,
    );
    if (!permission.allowed) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }

    const recipients = await this.resolver.resolve(
      workspace.workspaceId,
      input.audienceType,
      input.audienceConfig || {},
    );

    return {
      totalCount: recipients.length,
      recipients,
    };
  }
}
