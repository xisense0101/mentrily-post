import { Inject, Injectable } from '@nestjs/common';
import { PrismaService, getPrismaClient, mapPrismaError } from '@mentrily/data-platform';
import type { TransactionContext } from '@mentrily/service-core';
import { NotificationDeliveryAttemptRepository } from '../../../domain/repositories/index.js';
import type { NotificationDeliveryAttempt } from '../../../domain/entities/index.js';
import {
  toDomainNotificationDeliveryAttempt,
  toPersistenceNotificationDeliveryAttemptCreate,
  toPersistenceNotificationDeliveryAttemptUpdate,
} from './communication-prisma.mapper.js';

type CommunicationPrismaClient = {
  notificationDeliveryAttempt: {
    upsert: PrismaService['notificationDeliveryAttempt']['upsert'];
    findUnique: PrismaService['notificationDeliveryAttempt']['findUnique'];
    findMany: PrismaService['notificationDeliveryAttempt']['findMany'];
    count: PrismaService['notificationDeliveryAttempt']['count'];
  };
};

function resolveClient(prisma: PrismaService, transaction?: TransactionContext): CommunicationPrismaClient {
  return getPrismaClient(prisma, transaction) as unknown as CommunicationPrismaClient;
}

@Injectable()
export class PrismaNotificationDeliveryAttemptRepository implements NotificationDeliveryAttemptRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async save(
    attempt: NotificationDeliveryAttempt,
    transaction?: TransactionContext,
  ): Promise<NotificationDeliveryAttempt> {
    const client = resolveClient(this.prisma, transaction);
    try {
      const record = await client.notificationDeliveryAttempt.upsert({
        where: { id: attempt.id },
        create: toPersistenceNotificationDeliveryAttemptCreate(attempt),
        update: toPersistenceNotificationDeliveryAttemptUpdate(attempt),
      });
      return toDomainNotificationDeliveryAttempt(record);
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async findById(
    id: string,
    transaction?: TransactionContext,
  ): Promise<NotificationDeliveryAttempt | null> {
    const client = resolveClient(this.prisma, transaction);
    try {
      const record = await client.notificationDeliveryAttempt.findUnique({ where: { id } });
      return record ? toDomainNotificationDeliveryAttempt(record) : null;
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async findByIntentId(
    intentId: string,
    transaction?: TransactionContext,
  ): Promise<NotificationDeliveryAttempt[]> {
    const client = resolveClient(this.prisma, transaction);
    try {
      const records = await client.notificationDeliveryAttempt.findMany({
        where: { intentId },
        orderBy: [{ attemptNumber: 'asc' }, { createdAt: 'asc' }],
      });
      return records.map(toDomainNotificationDeliveryAttempt);
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async countByIntentId(intentId: string, transaction?: TransactionContext): Promise<number> {
    const client = resolveClient(this.prisma, transaction);
    try {
      return await client.notificationDeliveryAttempt.count({
        where: { intentId },
      });
    } catch (error) {
      throw mapPrismaError(error);
    }
  }
}
