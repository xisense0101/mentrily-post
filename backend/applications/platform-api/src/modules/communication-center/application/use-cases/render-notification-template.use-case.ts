import { Inject, Injectable } from '@nestjs/common';
import { AppError, PERMISSION_EVALUATOR, type PermissionEvaluator, type RequestContext } from '@mentrily/service-core';
import { PermissionCatalog } from '@mentrily/security-toolkit';
import { NotificationTemplateRepository } from '../../domain/repositories/index.js';
import { NotificationTemplatePolicyService } from '../../domain/services/index.js';
import type { RenderNotificationTemplateInput, RenderNotificationTemplateResponse } from '../dto/index.js';
import { NotificationTemplateRendererService } from '../services/index.js';
import { ensureNotificationTemplateOwnership, requireCommunicationWorkspace } from '../support/index.js';

@Injectable()
export class RenderNotificationTemplateUseCase {
  constructor(
    @Inject(NotificationTemplateRepository) private readonly templateRepository: NotificationTemplateRepository,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
    @Inject(NotificationTemplatePolicyService) private readonly templatePolicy: NotificationTemplatePolicyService,
    @Inject(NotificationTemplateRendererService) private readonly renderer: NotificationTemplateRendererService,
  ) {}

  async execute(
    context: RequestContext,
    templateId: string,
    input: RenderNotificationTemplateInput,
  ): Promise<RenderNotificationTemplateResponse> {
    const workspace = requireCommunicationWorkspace(context);
    const permission = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.COMMUNICATION_TEMPLATE_RENDER, workspace },
      context,
    );
    if (!permission.allowed) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }
    const template = await this.templateRepository.findById(templateId);
    if (!template) {
      throw new AppError('NOT_FOUND', 'notification template not found', 404);
    }
    ensureNotificationTemplateOwnership(template, context);
    this.templatePolicy.assertCanPreviewRender(template);
    return this.renderer.render({
      subjectTemplate: template.subjectTemplate,
      bodyTemplate: template.bodyTemplate,
      variables: input.variables,
      allowedVariables: template.variables,
    });
  }
}
