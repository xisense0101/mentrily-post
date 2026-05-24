import { Inject, Injectable } from '@nestjs/common';
import {
  AppError,
  PERMISSION_EVALUATOR,
  type PermissionEvaluator,
  type RequestContext,
} from '@mentrily/service-core';
import { PermissionCatalog } from '@mentrily/security-toolkit';
import { PrismaService } from '@mentrily/data-platform';
import { NotificationTemplateRendererService } from '../services/notification-template-renderer.service.js';
import type {
  CampaignMessagePreviewRequestContract,
  CampaignMessagePreviewResponseContract,
} from '@mentrily/contract-catalog';

@Injectable()
export class PreviewCampaignMessageUseCase {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(NotificationTemplateRendererService)
    private readonly renderer: NotificationTemplateRendererService,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
  ) {}

  async execute(
    context: RequestContext,
    input: CampaignMessagePreviewRequestContract,
  ): Promise<CampaignMessagePreviewResponseContract> {
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

    const variables = input.variables || {};

    if (input.templateId) {
      const template = await this.prisma.notificationTemplate.findUnique({
        where: { id: input.templateId },
      });
      if (!template || template.workspaceId !== workspace.workspaceId) {
        throw new AppError('NOT_FOUND', 'notification template not found', 404);
      }

      // Render template using its defined subject, body, and allowed variables
      const allowedVars = (template.variables || []) as string[];
      const result = this.renderer.render({
        subjectTemplate: template.subjectTemplate || undefined,
        bodyTemplate: template.bodyTemplate,
        variables,
        allowedVariables: allowedVars,
      });

      return {
        subject: result.subject,
        body: result.body,
      };
    }

    // Otherwise, render using raw body / subject from the input
    const allowedVariables = Object.keys(variables);
    const result = this.renderer.render({
      subjectTemplate: input.subject || undefined,
      bodyTemplate: input.body,
      variables,
      allowedVariables,
    });

    return {
      subject: result.subject,
      body: result.body,
    };
  }
}
