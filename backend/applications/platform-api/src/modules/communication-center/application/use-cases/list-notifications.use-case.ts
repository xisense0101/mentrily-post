import { Inject, Injectable } from '@nestjs/common';
import {
  AppError,
  PERMISSION_EVALUATOR,
  type PermissionEvaluator,
  type RequestContext,
} from '@mentrily/service-core';
import { PermissionCatalog } from '@mentrily/security-toolkit';
import { NotificationIntentRepository } from '../../domain/repositories/index.js';
import { mapNotificationIntentToInboxResponse } from '../mappers/index.js';
import type { NotificationInboxListResponse } from '../dto/index.js';
import { requireCommunicationActor } from '../support/index.js';

@Injectable()
export class ListNotificationsUseCase {
  constructor(
    @Inject(NotificationIntentRepository)
    private readonly intentRepository: NotificationIntentRepository,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
  ) {}

  async execute(
    context: RequestContext,
    query: { status?: 'ALL' | 'UNREAD' | 'READ' | 'ARCHIVED'; limit?: number },
  ): Promise<NotificationInboxListResponse> {
    const actor = requireCommunicationActor(context);

    const permission = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.COMMUNICATION_NOTIFICATION_READ_OWN, workspace: actor },
      context,
    );
    if (!permission.allowed) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }

    const listInput: {
      workspaceId: string;
      recipientId: string;
      status?: 'ALL' | 'UNREAD' | 'READ' | 'ARCHIVED';
      limit?: number;
    } = {
      workspaceId: actor.workspaceId,
      recipientId: actor.actorId,
    };
    if (query.status !== undefined) {
      listInput.status = query.status;
    }
    if (query.limit !== undefined) {
      listInput.limit = query.limit;
    }

    const [intents, unreadCount] = await Promise.all([
      this.intentRepository.listByRecipient(listInput),
      this.intentRepository.countUnreadByRecipient({
        workspaceId: actor.workspaceId,
        recipientId: actor.actorId,
      }),
    ]);

    return {
      items: intents.map(mapNotificationIntentToInboxResponse),
      unreadCount,
    };
  }
}
