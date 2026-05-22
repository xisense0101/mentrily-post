import { Inject, Injectable } from '@nestjs/common';
import {
  AppError,
  PERMISSION_EVALUATOR,
  type PermissionEvaluator,
  type RequestContext,
} from '@mentrily/service-core';
import { PermissionCatalog } from '@mentrily/security-toolkit';
import { NotificationIntentRepository } from '../../domain/repositories/index.js';
import type { NotificationUnreadCountResponse } from '../dto/index.js';
import { requireCommunicationActor } from '../support/index.js';

@Injectable()
export class GetUnreadCountUseCase {
  constructor(
    @Inject(NotificationIntentRepository)
    private readonly intentRepository: NotificationIntentRepository,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
  ) {}

  async execute(context: RequestContext): Promise<NotificationUnreadCountResponse> {
    const actor = requireCommunicationActor(context);

    const permission = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.COMMUNICATION_NOTIFICATION_READ_OWN, workspace: actor },
      context,
    );
    if (!permission.allowed) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }

    const count = await this.intentRepository.countUnreadByRecipient({
      workspaceId: actor.workspaceId,
      recipientId: actor.actorId,
    });

    return { unreadCount: count };
  }
}
