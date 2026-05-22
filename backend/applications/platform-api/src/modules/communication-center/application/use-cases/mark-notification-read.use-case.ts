import { Inject, Injectable } from '@nestjs/common';
import {
  AppError,
  PERMISSION_EVALUATOR,
  type PermissionEvaluator,
  type RequestContext,
} from '@mentrily/service-core';
import { PermissionCatalog } from '@mentrily/security-toolkit';
import { NotificationIntentRepository } from '../../domain/repositories/index.js';
import { NotificationIntent } from '../../domain/entities/index.js';
import { mapNotificationIntentToInboxResponse } from '../mappers/index.js';
import type { NotificationInboxItemResponse } from '../dto/index.js';
import { requireCommunicationActor } from '../support/index.js';

@Injectable()
export class MarkNotificationReadUseCase {
  constructor(
    @Inject(NotificationIntentRepository)
    private readonly intentRepository: NotificationIntentRepository,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
  ) {}

  async execute(
    context: RequestContext,
    notificationId: string,
  ): Promise<NotificationInboxItemResponse> {
    const actor = requireCommunicationActor(context);

    const permission = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.COMMUNICATION_NOTIFICATION_UPDATE_OWN, workspace: actor },
      context,
    );
    if (!permission.allowed) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }

    const intent = await this.intentRepository.findById(notificationId);
    if (
      !intent ||
      intent.tenantId !== actor.tenantId ||
      intent.workspaceId !== actor.workspaceId ||
      intent.recipient.principalId !== actor.actorId ||
      intent.channel !== 'IN_APP' ||
      intent.status !== 'DISPATCHED'
    ) {
      throw new AppError('NOT_FOUND', 'notification not found', 404);
    }

    if (typeof intent.metadata.readAt === 'string') {
      return mapNotificationIntentToInboxResponse(intent);
    }

    const now = new Date();
    const updated = new NotificationIntent({
      ...intent,
      metadata: {
        ...intent.metadata,
        readAt: now.toISOString(),
      },
      updatedAt: now,
    });

    const saved = await this.intentRepository.save(updated);
    return mapNotificationIntentToInboxResponse(saved);
  }
}
