import { Inject, Injectable } from '@nestjs/common';
import { PrismaService, getPrismaClient, mapPrismaError } from '@mentrily/data-platform';
import type { TransactionContext } from '@mentrily/service-core';
import { NotificationTemplateRepository } from '../../../domain/repositories/index.js';
import type { NotificationChannel, NotificationTemplate, NotificationTemplateStatus } from '../../../domain/index.js';
import {
  toDomainNotificationTemplate,
  toPersistenceNotificationTemplateCreate,
  toPersistenceNotificationTemplateUpdate,
} from './communication-prisma.mapper.js';

type CommunicationPrismaClient = {
  notificationTemplate: {
    upsert: PrismaService['notificationTemplate']['upsert'];
    findUnique: PrismaService['notificationTemplate']['findUnique'];
    findMany: PrismaService['notificationTemplate']['findMany'];
  };
};

function resolveClient(prisma: PrismaService, transaction?: TransactionContext): CommunicationPrismaClient {
  return getPrismaClient(prisma, transaction) as unknown as CommunicationPrismaClient;
}

@Injectable()
export class PrismaNotificationTemplateRepository implements NotificationTemplateRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async save(template: NotificationTemplate, transaction?: TransactionContext): Promise<NotificationTemplate> {
    const client = resolveClient(this.prisma, transaction);
    try {
      const record = await client.notificationTemplate.upsert({
        where: { id: template.id },
        create: toPersistenceNotificationTemplateCreate(template),
        update: toPersistenceNotificationTemplateUpdate(template),
      });
      return toDomainNotificationTemplate(record);
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async findById(id: string, transaction?: TransactionContext): Promise<NotificationTemplate | null> {
    const client = resolveClient(this.prisma, transaction);
    try {
      const record = await client.notificationTemplate.findUnique({ where: { id } });
      return record ? toDomainNotificationTemplate(record) : null;
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async findByWorkspaceKey(
    input: { workspaceId: string; key: string },
    transaction?: TransactionContext,
  ): Promise<NotificationTemplate | null> {
    const client = resolveClient(this.prisma, transaction);
    try {
      const record = await client.notificationTemplate.findUnique({
        where: { workspaceId_key: { workspaceId: input.workspaceId, key: input.key } },
      });
      return record ? toDomainNotificationTemplate(record) : null;
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async listByWorkspace(
    input: { workspaceId: string; channel?: NotificationChannel | undefined; status?: NotificationTemplateStatus | undefined },
    transaction?: TransactionContext,
  ): Promise<NotificationTemplate[]> {
    const client = resolveClient(this.prisma, transaction);
    try {
      const records = await client.notificationTemplate.findMany({
        where: {
          workspaceId: input.workspaceId,
          ...(input.channel ? { channel: input.channel } : {}),
          ...(input.status ? { status: input.status } : {}),
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      });
      return records.map(toDomainNotificationTemplate);
    } catch (error) {
      throw mapPrismaError(error);
    }
  }
}
