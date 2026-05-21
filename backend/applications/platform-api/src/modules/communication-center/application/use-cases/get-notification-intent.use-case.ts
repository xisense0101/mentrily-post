import { Inject, Injectable } from '@nestjs/common';
import { AppError, PERMISSION_EVALUATOR, type PermissionEvaluator, type RequestContext } from '@mentrily/service-core';
import { PermissionCatalog } from '@mentrily/security-toolkit';
import { NotificationIntentRepository } from '../../domain/repositories/index.js';
import { mapNotificationIntentToResponse } from '../mappers/index.js';
import type { NotificationIntentResponse } from '../dto/index.js';
import { ensureNotificationIntentOwnership, requireCommunicationWorkspace } from '../support/index.js';

@Injectable()
export class GetNotificationIntentUseCase {
  constructor(
    @Inject(NotificationIntentRepository) private readonly intentRepository: NotificationIntentRepository,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
  ) {}

  async execute(context: RequestContext, intentId: string): Promise<NotificationIntentResponse> {
    const workspace = requireCommunicationWorkspace(context);
    const permission = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.COMMUNICATION_INTENT_READ, workspace },
      context,
    );
    if (!permission.allowed) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }
    const intent = await this.intentRepository.findById(intentId);
    if (!intent) {
      throw new AppError('NOT_FOUND', 'notification intent not found', 404);
    }
    ensureNotificationIntentOwnership(intent, context);
    return mapNotificationIntentToResponse(intent);
  }
}
