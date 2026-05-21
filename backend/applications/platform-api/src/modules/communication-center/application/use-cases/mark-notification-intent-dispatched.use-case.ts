import { Inject, Injectable } from '@nestjs/common';
import {
  AppError,
  AUDIT_RECORDER,
  type AuditRecorder,
  PERMISSION_EVALUATOR,
  type PermissionEvaluator,
  type RequestContext,
  TRANSACTION_RUNNER,
  type TransactionRunner,
} from '@mentrily/service-core';
import { PermissionCatalog } from '@mentrily/security-toolkit';
import { communicationIntentDispatched } from '../../domain/events/index.js';
import { NotificationIntentRepository } from '../../domain/repositories/index.js';
import { mapNotificationIntentToResponse } from '../mappers/index.js';
import type { MarkNotificationIntentDispatchedInput, NotificationIntentResponse } from '../dto/index.js';
import { CommunicationEventPublisherService } from '../services/index.js';
import { ensureNotificationIntentOwnership, requireCommunicationActor } from '../support/index.js';

@Injectable()
export class MarkNotificationIntentDispatchedUseCase {
  constructor(
    @Inject(NotificationIntentRepository) private readonly intentRepository: NotificationIntentRepository,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
    @Inject(TRANSACTION_RUNNER) private readonly transactionRunner: TransactionRunner,
    @Inject(AUDIT_RECORDER) private readonly auditRecorder: AuditRecorder,
    @Inject(CommunicationEventPublisherService) private readonly eventPublisher: CommunicationEventPublisherService,
  ) {}

  async execute(
    context: RequestContext,
    intentId: string,
    input: MarkNotificationIntentDispatchedInput,
  ): Promise<NotificationIntentResponse> {
    const workspace = requireCommunicationActor(context);
    const permission = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.COMMUNICATION_INTENT_DISPATCH, workspace },
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

    return this.transactionRunner.run(async (tx) => {
      const dispatched = await this.intentRepository.save(
        intent.markDispatched({ provider: input.provider, metadata: input.metadata }),
        tx,
      );
      await this.auditRecorder.record(
        {
          action: 'communication.intent.dispatched',
          actorId: workspace.actorId,
          targetType: 'communication.intent',
          targetId: dispatched.id,
          metadata: { channel: dispatched.channel, provider: dispatched.provider },
        },
        context,
        tx,
      );
      await this.eventPublisher.publishDomainEvent(
        communicationIntentDispatched({
          tenantId: dispatched.tenantId,
          workspaceId: dispatched.workspaceId,
          intentId: dispatched.id,
          channel: dispatched.channel,
          status: dispatched.status,
          provider: dispatched.provider,
        }),
        context,
        tx,
      );
      return mapNotificationIntentToResponse(dispatched);
    });
  }
}
