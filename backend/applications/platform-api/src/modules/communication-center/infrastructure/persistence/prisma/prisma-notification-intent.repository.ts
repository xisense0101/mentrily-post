import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService, getPrismaClient, mapPrismaError } from '@mentrily/data-platform';
import type { TransactionContext } from '@mentrily/service-core';
import { NotificationIntentRepository } from '../../../domain/repositories/index.js';
import type {
  NotificationChannel,
  NotificationIntent,
  NotificationIntentStatus,
} from '../../../domain/index.js';
import {
  toDomainNotificationIntent,
  toPersistenceNotificationIntentCreate,
  toPersistenceNotificationIntentUpdate,
} from './communication-prisma.mapper.js';

type CommunicationPrismaClient = {
  notificationIntent: {
    upsert: PrismaService['notificationIntent']['upsert'];
    findUnique: PrismaService['notificationIntent']['findUnique'];
    findMany: PrismaService['notificationIntent']['findMany'];
    updateMany: PrismaService['notificationIntent']['updateMany'];
    count: PrismaService['notificationIntent']['count'];
  };
};

function resolveClient(
  prisma: PrismaService,
  transaction?: TransactionContext,
): CommunicationPrismaClient {
  return getPrismaClient(prisma, transaction) as unknown as CommunicationPrismaClient;
}

@Injectable()
export class PrismaNotificationIntentRepository implements NotificationIntentRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async save(
    intent: NotificationIntent,
    transaction?: TransactionContext,
  ): Promise<NotificationIntent> {
    const client = resolveClient(this.prisma, transaction);
    try {
      const record = await client.notificationIntent.upsert({
        where: { id: intent.id },
        create: toPersistenceNotificationIntentCreate(intent),
        update: toPersistenceNotificationIntentUpdate(intent),
      });
      return toDomainNotificationIntent(record);
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async findById(id: string, transaction?: TransactionContext): Promise<NotificationIntent | null> {
    const client = resolveClient(this.prisma, transaction);
    try {
      const record = await client.notificationIntent.findUnique({ where: { id } });
      return record ? toDomainNotificationIntent(record) : null;
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async lock(id: string, transaction?: TransactionContext): Promise<NotificationIntent | null> {
    const client = getPrismaClient(this.prisma, transaction);
    try {
      const rawRecords: any[] = await (client as any).$queryRawUnsafe(
        `SELECT * FROM "NotificationIntent" WHERE id = $1::uuid FOR UPDATE`,
        id,
      );
      if (rawRecords.length === 0) {
        return null;
      }
      return toDomainNotificationIntent(rawRecords[0]);
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async listByWorkspace(
    input: {
      workspaceId: string;
      channel?: NotificationChannel | undefined;
      status?: NotificationIntentStatus | undefined;
    },
    transaction?: TransactionContext,
  ): Promise<NotificationIntent[]> {
    const client = resolveClient(this.prisma, transaction);
    try {
      const records = await client.notificationIntent.findMany({
        where: {
          workspaceId: input.workspaceId,
          ...(input.channel ? { channel: input.channel } : {}),
          ...(input.status ? { status: input.status } : {}),
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      });
      return records.map(toDomainNotificationIntent);
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async findDueQueued(
    input: {
      workspaceId?: string | undefined;
      limit: number;
      now: Date;
    },
    transaction?: TransactionContext,
  ): Promise<NotificationIntent[]> {
    const client = resolveClient(this.prisma, transaction);
    const boundedLimit = Math.min(Math.max(input.limit, 1), 100);

    try {
      const records = await client.notificationIntent.findMany({
        where: {
          status: 'QUEUED',
          ...(input.workspaceId ? { workspaceId: input.workspaceId } : {}),
          OR: [{ scheduledFor: null }, { scheduledFor: { lte: input.now } }],
        },
        orderBy: [{ priority: 'desc' }, { queuedAt: 'asc' }, { createdAt: 'asc' }],
        take: boundedLimit,
      });
      return records.map(toDomainNotificationIntent);
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async markDispatchedIfQueued(
    input: {
      intentId: string;
      provider: NotificationIntent['provider'];
      metadata?: Record<string, unknown> | undefined;
      occurredAt: Date;
    },
    transaction?: TransactionContext,
  ): Promise<NotificationIntent | null> {
    const client = resolveClient(this.prisma, transaction);

    try {
      const current = await client.notificationIntent.findUnique({ where: { id: input.intentId } });
      if (!current) {
        return null;
      }

      const result = await client.notificationIntent.updateMany({
        where: {
          id: input.intentId,
          status: 'QUEUED',
        },
        data: {
          status: 'DISPATCHED',
          provider: input.provider,
          dispatchedAt: input.occurredAt,
          updatedAt: input.occurredAt,
          lockedAt: null,
          lockedBy: null,
          metadata: {
            ...(typeof current.metadata === 'object' &&
            current.metadata !== null &&
            !Array.isArray(current.metadata)
              ? (current.metadata as Record<string, unknown>)
              : {}),
            ...(input.metadata ?? {}),
          } as never,
        },
      });

      if (result.count !== 1) {
        return null;
      }

      const updated = await client.notificationIntent.findUnique({ where: { id: input.intentId } });
      return updated ? toDomainNotificationIntent(updated) : null;
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async markFailedIfQueued(
    input: {
      intentId: string;
      failureReason: string;
      provider: NotificationIntent['provider'];
      metadata?: Record<string, unknown> | undefined;
      occurredAt: Date;
    },
    transaction?: TransactionContext,
  ): Promise<NotificationIntent | null> {
    const client = resolveClient(this.prisma, transaction);

    try {
      const current = await client.notificationIntent.findUnique({ where: { id: input.intentId } });
      if (!current) {
        return null;
      }

      const result = await client.notificationIntent.updateMany({
        where: {
          id: input.intentId,
          status: 'QUEUED',
        },
        data: {
          status: 'FAILED',
          provider: input.provider,
          failureReason: input.failureReason,
          failedAt: input.occurredAt,
          updatedAt: input.occurredAt,
          lockedAt: null,
          lockedBy: null,
          metadata: {
            ...(typeof current.metadata === 'object' &&
            current.metadata !== null &&
            !Array.isArray(current.metadata)
              ? (current.metadata as Record<string, unknown>)
              : {}),
            ...(input.metadata ?? {}),
          } as never,
        },
      });

      if (result.count !== 1) {
        return null;
      }

      const updated = await client.notificationIntent.findUnique({ where: { id: input.intentId } });
      return updated ? toDomainNotificationIntent(updated) : null;
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async listByRecipient(
    input: {
      workspaceId: string;
      recipientId: string;
      status?: 'ALL' | 'UNREAD' | 'READ' | 'ARCHIVED';
      limit?: number;
    },
    transaction?: TransactionContext,
  ): Promise<NotificationIntent[]> {
    const client = resolveClient(this.prisma, transaction);
    const limit = input.limit ? Math.min(Math.max(input.limit, 1), 100) : 50;

    const where: Prisma.NotificationIntentWhereInput = {
      workspaceId: input.workspaceId,
      channel: 'IN_APP',
      status: 'DISPATCHED',
      recipient: {
        path: ['principalId'],
        equals: input.recipientId,
      },
    };

    const conditions: Prisma.NotificationIntentWhereInput[] = [];
    if (input.status === 'ARCHIVED') {
      conditions.push({
        metadata: {
          path: ['archivedAt'],
          not: Prisma.DbNull,
        },
      });
    } else {
      conditions.push({
        metadata: {
          path: ['archivedAt'],
          equals: Prisma.DbNull,
        },
      });

      if (input.status === 'UNREAD') {
        conditions.push({
          metadata: {
            path: ['readAt'],
            equals: Prisma.DbNull,
          },
        });
      } else if (input.status === 'READ') {
        conditions.push({
          metadata: {
            path: ['readAt'],
            not: Prisma.DbNull,
          },
        });
      }
    }

    if (conditions.length > 0) {
      where.AND = conditions;
    }

    try {
      const records = await client.notificationIntent.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        take: limit,
      });
      return records.map(toDomainNotificationIntent);
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async countUnreadByRecipient(
    input: {
      workspaceId: string;
      recipientId: string;
    },
    transaction?: TransactionContext,
  ): Promise<number> {
    const client = resolveClient(this.prisma, transaction);
    try {
      const count = await client.notificationIntent.count({
        where: {
          workspaceId: input.workspaceId,
          channel: 'IN_APP',
          status: 'DISPATCHED',
          recipient: {
            path: ['principalId'],
            equals: input.recipientId,
          },
          AND: [
            {
              metadata: {
                path: ['archivedAt'],
                equals: Prisma.DbNull,
              },
            },
            {
              metadata: {
                path: ['readAt'],
                equals: Prisma.DbNull,
              },
            },
          ],
        },
      });
      return count;
    } catch (error) {
      throw mapPrismaError(error);
    }
  }
}
