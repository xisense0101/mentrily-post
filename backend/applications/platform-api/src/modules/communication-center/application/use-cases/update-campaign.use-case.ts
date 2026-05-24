import { Inject, Injectable } from '@nestjs/common';
import {
  AppError,
  PERMISSION_EVALUATOR,
  type PermissionEvaluator,
  type RequestContext,
} from '@mentrily/service-core';
import { PermissionCatalog } from '@mentrily/security-toolkit';
import { PrismaService } from '@mentrily/data-platform';
import type { CampaignContract, UpdateCampaignRequestContract } from '@mentrily/contract-catalog';

@Injectable()
export class UpdateCampaignUseCase {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
  ) {}

  async execute(
    context: RequestContext,
    campaignId: string,
    input: UpdateCampaignRequestContract,
  ): Promise<CampaignContract> {
    const workspace = context.workspace;
    if (!workspace) {
      throw new AppError('VALIDATION_ERROR', 'missing workspace context', 400);
    }

    const permission = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.CAMPAIGN_UPDATE, workspace },
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
      throw new AppError('VALIDATION_ERROR', 'archived campaign cannot be modified', 400);
    }

    if (input.templateId) {
      const template = await this.prisma.notificationTemplate.findUnique({
        where: { id: input.templateId },
      });
      if (!template || template.workspaceId !== workspace.workspaceId) {
        throw new AppError('NOT_FOUND', 'notification template not found', 404);
      }
    }

    const updated = await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description ?? null } : {}),
        ...(input.channel !== undefined ? { channel: input.channel } : {}),
        ...(input.templateId !== undefined ? { templateId: input.templateId ?? null } : {}),
        ...(input.subject !== undefined ? { subject: input.subject ?? null } : {}),
        ...(input.body !== undefined ? { body: input.body } : {}),
        ...(input.audienceType !== undefined ? { audienceType: input.audienceType } : {}),
        ...(input.audienceConfig !== undefined
          ? { audienceConfig: input.audienceConfig as any }
          : {}),
        ...(input.scheduledFor !== undefined
          ? { scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : null }
          : {}),
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
