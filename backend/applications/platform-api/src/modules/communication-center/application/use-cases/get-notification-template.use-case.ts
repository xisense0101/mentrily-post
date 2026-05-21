import { Inject, Injectable } from '@nestjs/common';
import { AppError, PERMISSION_EVALUATOR, type PermissionEvaluator, type RequestContext } from '@mentrily/service-core';
import { PermissionCatalog } from '@mentrily/security-toolkit';
import { NotificationTemplateRepository } from '../../domain/repositories/index.js';
import { mapNotificationTemplateToResponse } from '../mappers/index.js';
import type { NotificationTemplateResponse } from '../dto/index.js';
import { ensureNotificationTemplateOwnership, requireCommunicationWorkspace } from '../support/index.js';

@Injectable()
export class GetNotificationTemplateUseCase {
  constructor(
    @Inject(NotificationTemplateRepository) private readonly templateRepository: NotificationTemplateRepository,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
  ) {}

  async execute(context: RequestContext, templateId: string): Promise<NotificationTemplateResponse> {
    const workspace = requireCommunicationWorkspace(context);
    const permission = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.COMMUNICATION_TEMPLATE_READ, workspace },
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
    return mapNotificationTemplateToResponse(template);
  }
}
