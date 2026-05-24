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
export class ArchiveCampaignUseCase {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
  ) {}

  async execute(context: RequestContext, campaignId: string): Promise<CampaignContract> {
    const workspace = context.workspace;
    if (!workspace) {
      throw new AppError('VALIDATION_ERROR', 'missing workspace context', 400);
    }

    const permission = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.CAMPAIGN_ARCHIVE, workspace },
      context,
    );
    if (!permission.allowed) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }

    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
    });
    if (!campaign || campaign.workspaceId !== workspace.workspaceId) {
      throw new AppError('NOT_FOUND', 'campaign not found', 404);
    }

    const archived = await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'ARCHIVED',
        archivedAt: new Date(),
      },
    });

    return {
      id: archived.id,
      tenantId: archived.tenantId,
      workspaceId: archived.workspaceId,
      name: archived.name,
      description: archived.description || undefined,
      status: archived.status,
      channel: archived.channel,
      templateId: archived.templateId || undefined,
      subject: archived.subject || undefined,
      body: archived.body,
      audienceType: archived.audienceType,
      audienceConfig: (archived.audienceConfig || {}) as Record<string, unknown>,
      scheduledFor: archived.scheduledFor ? archived.scheduledFor.toISOString() : undefined,
      createdByPrincipalId: archived.createdByPrincipalId,
      createdAt: archived.createdAt.toISOString(),
      updatedAt: archived.updatedAt.toISOString(),
      archivedAt: archived.archivedAt ? archived.archivedAt.toISOString() : undefined,
    };
  }
}
