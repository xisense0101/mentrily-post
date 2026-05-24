import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@mentrily/data-platform';
import crypto from 'node:crypto';
import type { RequestContext } from '@mentrily/service-core';
import { NotificationSchedulerService } from '../../../platform-api/src/modules/communication-center/application/services/notification-scheduler.service.js';
import { NotificationIntentRepository } from '../../../platform-api/src/modules/communication-center/domain/repositories/notification-intent.repository.js';

@Injectable()
export class CommunicationDeliveryWorker {
  private readonly logger = new Logger(CommunicationDeliveryWorker.name);
  private readonly workerId = `worker-${crypto.randomUUID()}`;

  constructor(
    private readonly prisma: PrismaService,
    private readonly schedulerService: NotificationSchedulerService,
    @Inject(NotificationIntentRepository)
    private readonly intentRepository: NotificationIntentRepository,
  ) {}

  async runOnce(
    batchSize = 10,
  ): Promise<{ claimed: number; processed: number; failed: number; skipped: number }> {
    const now = new Date();
    const lockTimeout = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes lock lease duration

    const claimedIds = await this.prisma.$transaction(async (tx) => {
      const dueIntents = await tx.notificationIntent.findMany({
        where: {
          status: 'QUEUED',
          AND: [
            {
              OR: [{ scheduledFor: null }, { scheduledFor: { lte: now } }],
            },
            {
              OR: [{ lockedAt: null }, { lockedAt: { lte: lockTimeout } }],
            },
          ],
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
        take: batchSize,
        select: { id: true },
      });

      if (dueIntents.length === 0) {
        return [];
      }

      const ids = dueIntents.map((intent) => intent.id);

      await tx.notificationIntent.updateMany({
        where: { id: { in: ids } },
        data: {
          lockedAt: now,
          lockedBy: this.workerId,
        },
      });

      return ids;
    });

    if (claimedIds.length === 0) {
      return { claimed: 0, processed: 0, failed: 0, skipped: 0 };
    }

    let processed = 0;
    let failed = 0;
    let skipped = 0;

    for (const intentId of claimedIds) {
      try {
        const intent = await this.intentRepository.findById(intentId);
        if (!intent) {
          skipped += 1;
          continue;
        }

        const context: RequestContext = {
          requestId: crypto.randomUUID(),
          correlationId: `comm-corr-${intent.id}`,
          timestamp: now.toISOString(),
          workspace: {
            workspaceId: intent.workspaceId,
            tenantId: intent.tenantId,
            actorId: intent.createdByPrincipalId,
          },
        };

        const result = await this.schedulerService.processIntent(intent, context, now);

        if (result.status === 'DISPATCHED') {
          processed += 1;
        } else if (result.status === 'FAILED') {
          failed += 1;
        } else {
          skipped += 1;
        }
      } catch (error: any) {
        this.logger.error(
          `Error processing communication intent ${intentId}: ${error?.message || error}`,
          error?.stack,
        );
        failed += 1;

        try {
          await this.prisma.notificationIntent.update({
            where: { id: intentId },
            data: {
              lockedAt: null,
              lockedBy: null,
            },
          });
        } catch (unlockError) {
          this.logger.error(`Failed to unlock intent ${intentId} after error: ${unlockError}`);
        }
      }
    }

    return { claimed: claimedIds.length, processed, failed, skipped };
  }
}
