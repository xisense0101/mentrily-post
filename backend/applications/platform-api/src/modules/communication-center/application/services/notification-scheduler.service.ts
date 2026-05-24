import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import {
  AUDIT_RECORDER,
  type AuditRecorder,
  type RequestContext,
  TRANSACTION_RUNNER,
  type TransactionRunner,
} from '@mentrily/service-core';
import { DataError, DataErrorType } from '@mentrily/data-platform';
import type { NotificationDeliveryProviderResult } from '../ports/index.js';
import {
  NotificationDeliveryAttempt,
  type NotificationIntent,
} from '../../domain/entities/index.js';
import {
  NotificationDeliveryAttemptRepository,
  NotificationIntentRepository,
} from '../../domain/repositories/index.js';
import {
  NotificationRecipientPolicyService,
  NotificationSchedulerPolicyService,
} from '../../domain/services/index.js';
import {
  NOTIFICATION_DELIVERY_PROVIDER_REGISTRY,
  type NotificationDeliveryProviderRegistry,
} from '../../infrastructure/index.js';
import { CommunicationEventPublisherService } from './communication-event-publisher.service.js';

export interface NotificationSchedulerProcessResult {
  intentId: string;
  status: 'DISPATCHED' | 'FAILED' | 'SKIPPED';
  deliveryAttemptId?: string | undefined;
  errorCode?: string | undefined;
  errorMessage?: string | undefined;
}

@Injectable()
export class NotificationSchedulerService {
  constructor(
    @Inject(NotificationIntentRepository)
    private readonly intentRepository: NotificationIntentRepository,
    @Inject(NotificationDeliveryAttemptRepository)
    private readonly attemptRepository: NotificationDeliveryAttemptRepository,
    @Inject(NOTIFICATION_DELIVERY_PROVIDER_REGISTRY)
    private readonly deliveryProviderRegistry: NotificationDeliveryProviderRegistry,
    @Inject(NotificationRecipientPolicyService)
    private readonly recipientPolicy: NotificationRecipientPolicyService,
    @Inject(NotificationSchedulerPolicyService)
    private readonly schedulerPolicy: NotificationSchedulerPolicyService,
    @Inject(TRANSACTION_RUNNER) private readonly transactionRunner: TransactionRunner,
    @Inject(AUDIT_RECORDER) private readonly auditRecorder: AuditRecorder,
    @Inject(CommunicationEventPublisherService)
    private readonly eventPublisher: CommunicationEventPublisherService,
  ) {}

  async processIntent(
    intent: NotificationIntent,
    context: RequestContext,
    now: Date,
  ): Promise<NotificationSchedulerProcessResult> {
    const existingAttempts = await this.attemptRepository.findByIntentId(intent.id);
    const initialEligibility = this.evaluateEligibility(intent, existingAttempts, now);

    if (!initialEligibility.eligible) {
      if (initialEligibility.reason === 'MAX_ATTEMPTS_REACHED') {
        return this.transactionRunner.run(async (tx) => {
          const failedIntent = await this.intentRepository.markFailedIfQueued(
            {
              intentId: intent.id,
              failureReason: 'maximum scheduler delivery attempts reached',
              provider: intent.provider,
              metadata: { schedulerReason: initialEligibility.reason },
              occurredAt: now,
            },
            tx,
          );

          if (!failedIntent) {
            return { intentId: intent.id, status: 'SKIPPED' };
          }

          await this.recordIntentFailure(failedIntent, context, tx);

          return {
            intentId: failedIntent.id,
            status: 'FAILED',
            errorCode: 'MAX_ATTEMPTS_REACHED',
            errorMessage: 'maximum scheduler delivery attempts reached',
          };
        });
      }

      return { intentId: intent.id, status: 'SKIPPED' };
    }

    return this.transactionRunner.run(async (tx) => {
      const currentIntent = await this.intentRepository.findById(intent.id, tx);
      if (!currentIntent) {
        return { intentId: intent.id, status: 'SKIPPED' };
      }

      const currentAttempts = await this.attemptRepository.findByIntentId(intent.id, tx);
      const eligibility = this.evaluateEligibility(currentIntent, currentAttempts, now);

      if (!eligibility.eligible) {
        if (eligibility.reason === 'MAX_ATTEMPTS_REACHED') {
          const failedIntent = await this.intentRepository.markFailedIfQueued(
            {
              intentId: currentIntent.id,
              failureReason: 'maximum scheduler delivery attempts reached',
              provider: currentIntent.provider,
              metadata: { schedulerReason: eligibility.reason },
              occurredAt: now,
            },
            tx,
          );

          if (!failedIntent) {
            return { intentId: currentIntent.id, status: 'SKIPPED' };
          }

          await this.recordIntentFailure(failedIntent, context, tx);

          return {
            intentId: failedIntent.id,
            status: 'FAILED',
            errorCode: 'MAX_ATTEMPTS_REACHED',
            errorMessage: 'maximum scheduler delivery attempts reached',
          };
        }

        return { intentId: currentIntent.id, status: 'SKIPPED' };
      }

      const pendingAttempt = NotificationDeliveryAttempt.createPending({
        id: randomUUID(),
        intentId: currentIntent.id,
        provider: currentIntent.provider,
        attemptNumber: currentAttempts.length + 1,
        metadata: { scheduler: true },
        createdAt: now,
      });

      const claimedAttempt = await this.savePendingAttempt(
        pendingAttempt,
        currentIntent.id,
        now,
        tx,
      );
      if (!claimedAttempt) {
        return { intentId: currentIntent.id, status: 'SKIPPED' };
      }

      const provider = this.deliveryProviderRegistry.getProvider({
        channel: currentIntent.channel,
        requestedProvider: currentIntent.provider,
      });
      const providerResult = await provider.deliver({
        intentId: currentIntent.id,
        channel: currentIntent.channel,
        recipient: currentIntent.recipient,
        subject: currentIntent.subject,
        body: currentIntent.body,
        metadata: currentIntent.metadata,
      });

      if (providerResult.status === 'SUCCEEDED') {
        const succeededAttempt = await this.attemptRepository.save(
          claimedAttempt.markSucceeded({
            providerMessageId: providerResult.providerMessageId,
            metadata: providerResult.metadata,
            occurredAt: now,
          }),
          tx,
        );

        const dispatchedIntent = await this.intentRepository.markDispatchedIfQueued(
          {
            intentId: currentIntent.id,
            provider: providerResult.provider,
            metadata: providerResult.metadata,
            occurredAt: now,
          },
          tx,
        );

        if (!dispatchedIntent) {
          return {
            intentId: currentIntent.id,
            status: 'SKIPPED',
            deliveryAttemptId: succeededAttempt.id,
          };
        }

        await this.auditRecorder.record(
          {
            action: 'communication.scheduler.intent.dispatched',
            targetType: 'communication.intent',
            targetId: dispatchedIntent.id,
            metadata: {
              provider: providerResult.provider,
              attemptNumber: succeededAttempt.attemptNumber,
            },
            ...(context.workspace?.actorId ? { actorId: context.workspace.actorId } : {}),
          },
          context,
          tx,
        );
        await this.eventPublisher.publishDomainEvent(
          {
            eventName: 'communication.intent.dispatched',
            eventVersion: 1,
            aggregateId: dispatchedIntent.id,
            tenantId: dispatchedIntent.tenantId,
            workspaceId: dispatchedIntent.workspaceId,
            occurredAt: now,
            payload: {
              intentId: dispatchedIntent.id,
              channel: dispatchedIntent.channel,
              status: dispatchedIntent.status,
              provider: dispatchedIntent.provider,
            },
          },
          context,
          tx,
        );

        return {
          intentId: dispatchedIntent.id,
          status: 'DISPATCHED',
          deliveryAttemptId: succeededAttempt.id,
        };
      }

      const failedAttempt = await this.attemptRepository.save(
        claimedAttempt.markFailed({
          errorCode: providerResult.errorCode,
          errorMessage: providerResult.errorMessage,
          metadata: providerResult.metadata,
          occurredAt: now,
        }),
        tx,
      );

      const attemptsCount = currentAttempts.length + 1;
      const isRetryable =
        providerResult.retryable === true && attemptsCount < this.schedulerPolicy.maxAttempts;

      if (isRetryable) {
        const retryBaseDelayMs = Number(process.env.COMMUNICATION_DELIVERY_RETRY_BASE_MS) || 1000;
        const delayMs = retryBaseDelayMs * Math.pow(2, attemptsCount - 1);
        const nextScheduledFor = new Date(now.getTime() + delayMs);

        await (tx.client as any).notificationIntent.update({
          where: { id: currentIntent.id },
          data: {
            scheduledFor: nextScheduledFor,
            lockedAt: null,
            lockedBy: null,
            updatedAt: now,
          },
        });

        return {
          intentId: currentIntent.id,
          status: 'SKIPPED',
          deliveryAttemptId: failedAttempt.id,
          errorCode: providerResult.errorCode,
          errorMessage: providerResult.errorMessage,
        };
      }

      const failedIntent = await this.intentRepository.markFailedIfQueued(
        {
          intentId: currentIntent.id,
          failureReason: this.resolveFailureReason(providerResult),
          provider: providerResult.provider,
          metadata: providerResult.metadata,
          occurredAt: now,
        },
        tx,
      );

      if (!failedIntent) {
        return {
          intentId: currentIntent.id,
          status: 'SKIPPED',
          deliveryAttemptId: failedAttempt.id,
        };
      }

      await this.recordIntentFailure(failedIntent, context, tx, failedAttempt.attemptNumber);

      return {
        intentId: failedIntent.id,
        status: 'FAILED',
        deliveryAttemptId: failedAttempt.id,
        errorCode: providerResult.errorCode,
        errorMessage: providerResult.errorMessage,
      };
    });
  }

  private evaluateEligibility(
    intent: NotificationIntent,
    attempts: NotificationDeliveryAttempt[],
    now: Date,
  ) {
    let recipientValid = true;

    try {
      this.recipientPolicy.validate(intent.channel, intent.recipient);
    } catch {
      recipientValid = false;
    }

    return this.schedulerPolicy.evaluate({
      intent,
      attempts,
      now,
      recipientValid,
    });
  }

  private async savePendingAttempt(
    attempt: NotificationDeliveryAttempt,
    intentId: string,
    now: Date,
    transaction: Parameters<AuditRecorder['record']>[2],
  ): Promise<NotificationDeliveryAttempt | null> {
    try {
      return await this.attemptRepository.save(attempt, transaction);
    } catch (error) {
      if (
        error instanceof DataError &&
        error.type === DataErrorType.UNIQUE_VIOLATION &&
        attempt.attemptNumber === 1
      ) {
        return null;
      }

      if (
        error instanceof DataError &&
        error.type === DataErrorType.UNIQUE_VIOLATION &&
        attempt.attemptNumber > 1
      ) {
        const failedIntent = await this.intentRepository.markFailedIfQueued(
          {
            intentId,
            failureReason: 'scheduler detected a concurrent attempt claim race',
            provider: attempt.provider,
            metadata: { schedulerReason: 'attempt-claim-race' },
            occurredAt: now,
          },
          transaction,
        );

        if (failedIntent) {
          return null;
        }
      }

      throw error;
    }
  }

  private resolveFailureReason(providerResult: NotificationDeliveryProviderResult): string {
    return (
      providerResult.errorMessage?.trim() ||
      providerResult.errorCode?.trim() ||
      'notification delivery failed'
    );
  }

  private async recordIntentFailure(
    intent: NotificationIntent,
    context: RequestContext,
    transaction: Parameters<AuditRecorder['record']>[2],
    attemptNumber?: number,
  ): Promise<void> {
    await this.auditRecorder.record(
      {
        action: 'communication.scheduler.intent.failed',
        targetType: 'communication.intent',
        targetId: intent.id,
        metadata: {
          provider: intent.provider,
          ...(attemptNumber ? { attemptNumber } : {}),
        },
        ...(context.workspace?.actorId ? { actorId: context.workspace.actorId } : {}),
      },
      context,
      transaction,
    );
    await this.eventPublisher.publishDomainEvent(
      {
        eventName: 'communication.intent.failed',
        eventVersion: 1,
        aggregateId: intent.id,
        tenantId: intent.tenantId,
        workspaceId: intent.workspaceId,
        occurredAt: new Date(context.timestamp),
        payload: {
          intentId: intent.id,
          channel: intent.channel,
          status: intent.status,
          provider: intent.provider,
          ...(intent.failureReason ? { failureReason: intent.failureReason } : {}),
        },
      },
      context,
      transaction,
    );
  }
}
