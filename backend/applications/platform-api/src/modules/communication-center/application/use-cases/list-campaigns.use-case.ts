import { Inject, Injectable } from '@nestjs/common';
import {
  AppError,
  PERMISSION_EVALUATOR,
  type PermissionEvaluator,
  type RequestContext,
} from '@mentrily/service-core';
import { PermissionCatalog } from '@mentrily/security-toolkit';
import { PrismaService } from '@mentrily/data-platform';
import type { CampaignContract } from '@mentrily/contract-catalog';

@Injectable()
export class ListCampaignsUseCase {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
  ) {}

  async execute(context: RequestContext): Promise<CampaignContract[]> {
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

    const campaigns = await this.prisma.campaign.findMany({
      where: {
        workspaceId: workspace.workspaceId,
        status: { not: 'ARCHIVED' }, // return non-archived by default
      },
      orderBy: { createdAt: 'desc' },
    });

    return campaigns.map((campaign) => ({
      id: campaign.id,
      tenantId: campaign.tenantId,
      workspaceId: campaign.workspaceId,
      name: campaign.name,
      description: campaign.description || undefined,
      status: campaign.status,
      channel: campaign.channel,
      templateId: campaign.templateId || undefined,
      subject: campaign.subject || undefined,
      body: campaign.body,
      audienceType: campaign.audienceType,
      audienceConfig: (campaign.audienceConfig || {}) as Record<string, unknown>,
      scheduledFor: campaign.scheduledFor ? campaign.scheduledFor.toISOString() : undefined,
      createdByPrincipalId: campaign.createdByPrincipalId,
      createdAt: campaign.createdAt.toISOString(),
      updatedAt: campaign.updatedAt.toISOString(),
      archivedAt: campaign.archivedAt ? campaign.archivedAt.toISOString() : undefined,
    }));
  }
}
