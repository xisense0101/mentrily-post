import { Inject, Injectable } from '@nestjs/common';
import { AppError, PERMISSION_EVALUATOR, type PermissionEvaluator, type RequestContext } from '@mentrily/service-core';
import { PermissionCatalog } from '@mentrily/security-toolkit';
import { NotificationIntentRepository } from '../../domain/repositories/index.js';
import type { NotificationChannel, NotificationIntentStatus } from '../../domain/value-objects/index.js';
import { mapNotificationIntentToResponse } from '../mappers/index.js';
import type { NotificationIntentResponse } from '../dto/index.js';
import { requireCommunicationWorkspace } from '../support/index.js';

@Injectable()
export class ListNotificationIntentsUseCase {
  constructor(
    @Inject(NotificationIntentRepository) private readonly intentRepository: NotificationIntentRepository,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
  ) {}

  async execute(
    context: RequestContext,
    filters: { channel?: NotificationChannel | undefined; status?: NotificationIntentStatus | undefined },
  ): Promise<NotificationIntentResponse[]> {
    const workspace = requireCommunicationWorkspace(context);
    const permission = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.COMMUNICATION_INTENT_LIST, workspace },
      context,
    );
    if (!permission.allowed) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }
    const intents = await this.intentRepository.listByWorkspace({
      workspaceId: workspace.workspaceId,
      channel: filters.channel,
      status: filters.status,
    });
    return intents.map(mapNotificationIntentToResponse);
  }
}
