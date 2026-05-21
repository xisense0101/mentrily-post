import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import { PrismaService, getPrismaClient, mapPrismaError } from '@mentrily/data-platform';
import { TransactionContext } from '@mentrily/service-core';
import { ContentPublishedSnapshot } from '../../../domain/entities/index.js';
import { ContentSnapshotRepository } from '../../../domain/repositories/index.js';
import {
  toDomainSnapshot,
  toPersistenceSnapshotCreate,
} from './content-prisma.mapper.js';

type ContentPrismaClient = Pick<
  PrismaClient,
  'contentDocument' | 'contentVersion' | 'contentBlock' | 'contentPublishedSnapshot'
>;

function resolveContentPrismaClient(
  prisma: PrismaService,
  transaction?: TransactionContext,
): ContentPrismaClient {
  return getPrismaClient(prisma, transaction) as unknown as ContentPrismaClient;
}

@Injectable()
export class PrismaContentSnapshotRepository implements ContentSnapshotRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async save(snapshot: ContentPublishedSnapshot, transaction?: TransactionContext): Promise<ContentPublishedSnapshot> {
    const client = resolveContentPrismaClient(this.prisma, transaction);

    try {
      const created = await client.contentPublishedSnapshot.create({
        data: toPersistenceSnapshotCreate(snapshot),
      });

      await client.contentDocument.update({
        where: { id: snapshot.documentId },
        data: {
          publishedSnapshotId: snapshot.id,
          publishedAt: snapshot.publishedAt,
        },
      });

      return toDomainSnapshot(created);
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async findLatestByDocumentId(
    documentId: string,
    transaction?: TransactionContext,
  ): Promise<ContentPublishedSnapshot | null> {
    try {
      const client = resolveContentPrismaClient(this.prisma, transaction);
      const record = await client.contentPublishedSnapshot.findFirst({
        where: { documentId },
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
      });

      return record ? toDomainSnapshot(record) : null;
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async listByDocumentId(
    documentId: string,
    transaction?: TransactionContext,
  ): Promise<ContentPublishedSnapshot[]> {
    try {
      const client = resolveContentPrismaClient(this.prisma, transaction);
      const records = await client.contentPublishedSnapshot.findMany({
        where: { documentId },
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
      });

      return records.map(toDomainSnapshot);
    } catch (error) {
      throw mapPrismaError(error);
    }
  }
}
