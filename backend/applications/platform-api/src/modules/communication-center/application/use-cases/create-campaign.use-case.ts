import { Inject, Injectable } from '@nestjs/common';
import {
  AppError,
  PERMISSION_EVALUATOR,
  type PermissionEvaluator,
  type RequestContext,
} from '@mentrily/service-core';
import { PermissionCatalog } from '@mentrily/security-toolkit';
import { PrismaService } from '@mentrily/data-platform';
import type { CampaignContract, CreateCampaignRequestContract } from '@mentrily/contract-catalog';

@Injectable()
export class CreateCampaignUseCase {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
  ) {}

  async execute(
    context: RequestContext,
    input: CreateCampaignRequestContract,
  ): Promise<CampaignContract> {
    const workspace = context.workspace;
    if (!workspace) {
      throw new AppError('VALIDATION_ERROR', 'missing workspace context', 400);
    }
    if (!workspace.actorId) {
      throw new AppError('UNAUTHORIZED', 'missing actor', 401);
    }

    const permission = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.CAMPAIGN_CREATE, workspace },
      context,
    );
    if (!permission.allowed) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }

    // Validate template if provided
    if (input.templateId) {
      const template = await this.prisma.notificationTemplate.findUnique({
        where: { id: input.templateId },
      });
      if (!template || template.workspaceId !== workspace.workspaceId) {
        throw new AppError('NOT_FOUND', 'notification template not found', 404);
      }
    }

    const campaign = await this.prisma.campaign.create({
      data: {
        tenantId: workspace.tenantId,
        workspaceId: workspace.workspaceId,
        name: input.name,
        description: input.description ?? null,
        channel: input.channel,
        templateId: input.templateId ?? null,
        subject: input.subject ?? null,
        body: input.body,
        audienceType: input.audienceType,
        audienceConfig: (input.audienceConfig || {}) as any,
        scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : null,
        createdByPrincipalId: workspace.actorId,
        status: 'DRAFT',
      },
    });

    return {
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
    };
  }
}
