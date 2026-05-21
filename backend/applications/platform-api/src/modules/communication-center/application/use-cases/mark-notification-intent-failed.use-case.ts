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
import { communicationIntentFailed } from '../../domain/events/index.js';
import { NotificationIntentRepository } from '../../domain/repositories/index.js';
import { mapNotificationIntentToResponse } from '../mappers/index.js';
import type { MarkNotificationIntentFailedInput, NotificationIntentResponse } from '../dto/index.js';
import { CommunicationEventPublisherService } from '../services/index.js';
import { ensureNotificationIntentOwnership, requireCommunicationActor } from '../support/index.js';

@Injectable()
export class MarkNotificationIntentFailedUseCase {
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
    input: MarkNotificationIntentFailedInput,
  ): Promise<NotificationIntentResponse> {
    const workspace = requireCommunicationActor(context);
    const permission = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.COMMUNICATION_INTENT_FAIL, workspace },
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
      const failed = await this.intentRepository.save(
        intent.markFailed({
          failureReason: input.failureReason,
          provider: input.provider,
          metadata: input.metadata,
        }),
        tx,
      );
      await this.auditRecorder.record(
        {
          action: 'communication.intent.failed',
          actorId: workspace.actorId,
          targetType: 'communication.intent',
          targetId: failed.id,
          metadata: { channel: failed.channel, provider: failed.provider },
        },
        context,
        tx,
      );
      await this.eventPublisher.publishDomainEvent(
        communicationIntentFailed({
          tenantId: failed.tenantId,
          workspaceId: failed.workspaceId,
          intentId: failed.id,
          channel: failed.channel,
          status: failed.status,
          provider: failed.provider,
          failureReason: failed.failureReason,
        }),
        context,
        tx,
      );
      return mapNotificationIntentToResponse(failed);
    });
  }
}
