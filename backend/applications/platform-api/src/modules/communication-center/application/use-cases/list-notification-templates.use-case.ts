import { Inject, Injectable } from '@nestjs/common';
import { AppError, PERMISSION_EVALUATOR, type PermissionEvaluator, type RequestContext } from '@mentrily/service-core';
import { PermissionCatalog } from '@mentrily/security-toolkit';
import { NotificationTemplateRepository } from '../../domain/repositories/index.js';
import type { NotificationChannel, NotificationTemplateStatus } from '../../domain/value-objects/index.js';
import { mapNotificationTemplateToResponse } from '../mappers/index.js';
import type { NotificationTemplateResponse } from '../dto/index.js';
import { requireCommunicationWorkspace } from '../support/index.js';

@Injectable()
export class ListNotificationTemplatesUseCase {
  constructor(
    @Inject(NotificationTemplateRepository) private readonly templateRepository: NotificationTemplateRepository,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
  ) {}

  async execute(
    context: RequestContext,
    filters: { channel?: NotificationChannel | undefined; status?: NotificationTemplateStatus | undefined },
  ): Promise<NotificationTemplateResponse[]> {
    const workspace = requireCommunicationWorkspace(context);
    const permission = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.COMMUNICATION_TEMPLATE_LIST, workspace },
      context,
    );
    if (!permission.allowed) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }
    const templates = await this.templateRepository.listByWorkspace({
      workspaceId: workspace.workspaceId,
      channel: filters.channel,
      status: filters.status,
    });
    return templates.map(mapNotificationTemplateToResponse);
  }
}
