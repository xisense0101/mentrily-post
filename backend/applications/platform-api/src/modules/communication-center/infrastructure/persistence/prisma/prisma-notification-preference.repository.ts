import { Inject, Injectable } from '@nestjs/common';
import { PrismaService, getPrismaClient, mapPrismaError } from '@mentrily/data-platform';
import type { TransactionContext } from '@mentrily/service-core';
import { NotificationPreferenceRepository } from '../../../domain/repositories/index.js';
import type { NotificationPreference } from '../../../domain/entities/index.js';
import {
  toDomainNotificationPreference,
  toPersistenceNotificationPreferenceCreate,
  toPersistenceNotificationPreferenceUpdate,
} from './communication-prisma.mapper.js';

type CommunicationPrismaClient = {
  notificationPreference: {
    upsert: PrismaService['notificationPreference']['upsert'];
    findUnique: PrismaService['notificationPreference']['findUnique'];
    findMany: PrismaService['notificationPreference']['findMany'];
  };
};

function resolveClient(
  prisma: PrismaService,
  transaction?: TransactionContext,
): CommunicationPrismaClient {
  return getPrismaClient(prisma, transaction) as unknown as CommunicationPrismaClient;
}

@Injectable()
export class PrismaNotificationPreferenceRepository implements NotificationPreferenceRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async save(
    preference: NotificationPreference,
    transaction?: TransactionContext,
  ): Promise<NotificationPreference> {
    const client = resolveClient(this.prisma, transaction);
    try {
      const record = await client.notificationPreference.upsert({
        where: {
          workspaceId_userId_channel_category: {
            workspaceId: preference.workspaceId,
            userId: preference.userId,
            channel: preference.channel,
            category: preference.category,
          },
        },
        create: toPersistenceNotificationPreferenceCreate(preference),
        update: toPersistenceNotificationPreferenceUpdate(preference),
      });
      return toDomainNotificationPreference(record);
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async listByUser(
    input: { workspaceId: string; userId: string },
    transaction?: TransactionContext,
  ): Promise<NotificationPreference[]> {
    const client = resolveClient(this.prisma, transaction);
    try {
      const records = await client.notificationPreference.findMany({
        where: {
          workspaceId: input.workspaceId,
          userId: input.userId,
        },
      });
      return records.map(toDomainNotificationPreference);
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async findUnique(
    input: { workspaceId: string; userId: string; channel: string; category: string },
    transaction?: TransactionContext,
  ): Promise<NotificationPreference | null> {
    const client = resolveClient(this.prisma, transaction);
    try {
      const record = await client.notificationPreference.findUnique({
        where: {
          workspaceId_userId_channel_category: {
            workspaceId: input.workspaceId,
            userId: input.userId,
            channel: input.channel,
            category: input.category,
          },
        },
      });
      return record ? toDomainNotificationPreference(record) : null;
    } catch (error) {
      throw mapPrismaError(error);
    }
  }
}
