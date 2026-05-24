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
export class ScheduleCampaignUseCase {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
  ) {}

  async execute(
    context: RequestContext,
    campaignId: string,
    scheduledForStr: string,
  ): Promise<CampaignContract> {
    const workspace = context.workspace;
    if (!workspace) {
      throw new AppError('VALIDATION_ERROR', 'missing workspace context', 400);
    }

    const permission = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.CAMPAIGN_SCHEDULE, workspace },
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

    if (campaign.status === 'ARCHIVED') {
      throw new AppError('VALIDATION_ERROR', 'cannot schedule an archived campaign', 400);
    }

    const scheduledFor = new Date(scheduledForStr);
    if (isNaN(scheduledFor.getTime()) || scheduledFor <= new Date()) {
      throw new AppError(
        'VALIDATION_ERROR',
        'scheduledFor must be a valid date in the future',
        400,
      );
    }

    const updated = await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'SCHEDULED',
        scheduledFor,
      },
    });

    return {
      id: updated.id,
      tenantId: updated.tenantId,
      workspaceId: updated.workspaceId,
      name: updated.name,
      description: updated.description || undefined,
      status: updated.status,
      channel: updated.channel,
      templateId: updated.templateId || undefined,
      subject: updated.subject || undefined,
      body: updated.body,
      audienceType: updated.audienceType,
      audienceConfig: (updated.audienceConfig || {}) as Record<string, unknown>,
      scheduledFor: updated.scheduledFor ? updated.scheduledFor.toISOString() : undefined,
      createdByPrincipalId: updated.createdByPrincipalId,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      archivedAt: updated.archivedAt ? updated.archivedAt.toISOString() : undefined,
    };
  }
}
