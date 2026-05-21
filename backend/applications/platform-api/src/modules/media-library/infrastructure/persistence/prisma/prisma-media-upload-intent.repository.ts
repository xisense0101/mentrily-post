import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import { PrismaService, getPrismaClient, mapPrismaError } from '@mentrily/data-platform';
import type { TransactionContext } from '@mentrily/service-core';
import { MediaUploadIntentRepository } from '../../../domain/repositories/index.js';
import type { MediaUploadIntent } from '../../../domain/index.js';
import {
  toDomainMediaUploadIntent,
  toPersistenceMediaUploadIntentCreate,
  toPersistenceMediaUploadIntentUpdate,
} from './media-prisma.mapper.js';

type MediaPrismaClient = Pick<PrismaClient, 'mediaUploadIntent'>;

function resolveClient(prisma: PrismaService, transaction?: TransactionContext): MediaPrismaClient {
  return getPrismaClient(prisma, transaction) as unknown as MediaPrismaClient;
}

@Injectable()
export class PrismaMediaUploadIntentRepository implements MediaUploadIntentRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async save(
    intent: MediaUploadIntent,
    transaction?: TransactionContext,
  ): Promise<MediaUploadIntent> {
    const client = resolveClient(this.prisma, transaction);
    try {
      const record = await client.mediaUploadIntent.upsert({
        where: { id: intent.id },
        create: toPersistenceMediaUploadIntentCreate(intent),
        update: toPersistenceMediaUploadIntentUpdate(intent),
      });
      return toDomainMediaUploadIntent(record);
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async findById(id: string, transaction?: TransactionContext): Promise<MediaUploadIntent | null> {
    const client = resolveClient(this.prisma, transaction);
    try {
      const record = await client.mediaUploadIntent.findUnique({ where: { id } });
      return record ? toDomainMediaUploadIntent(record) : null;
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async findByAssetId(
    assetId: string,
    transaction?: TransactionContext,
  ): Promise<MediaUploadIntent[]> {
    const client = resolveClient(this.prisma, transaction);
    try {
      const records = await client.mediaUploadIntent.findMany({
        where: { assetId },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      });
      return records.map(toDomainMediaUploadIntent);
    } catch (error) {
      throw mapPrismaError(error);
    }
  }
}
