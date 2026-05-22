import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import { PrismaService, getPrismaClient, mapPrismaError } from '@mentrily/data-platform';
import type { TransactionContext } from '@mentrily/service-core';
import { MediaRenditionRepository } from '../../../domain/repositories/index.js';
import type { MediaRendition } from '../../../domain/index.js';
import {
  toDomainMediaRendition,
  toPersistenceMediaRenditionCreate,
} from './media-prisma.mapper.js';

type MediaPrismaClient = Pick<PrismaClient, 'mediaRendition'>;

function resolveClient(prisma: PrismaService, transaction?: TransactionContext): MediaPrismaClient {
  return getPrismaClient(prisma, transaction) as unknown as MediaPrismaClient;
}

@Injectable()
export class PrismaMediaRenditionRepository implements MediaRenditionRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async save(rendition: MediaRendition, transaction?: TransactionContext): Promise<MediaRendition> {
    const client = resolveClient(this.prisma, transaction);
    try {
      const record = await client.mediaRendition.upsert({
        where: { id: rendition.id },
        create: toPersistenceMediaRenditionCreate(rendition),
        update: toPersistenceMediaRenditionCreate(rendition),
      });
      return toDomainMediaRendition(record);
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async findByAssetId(mediaAssetId: string, transaction?: TransactionContext): Promise<MediaRendition[]> {
    const client = resolveClient(this.prisma, transaction);
    try {
      const records = await client.mediaRendition.findMany({
        where: { mediaAssetId },
        orderBy: [{ createdAt: 'asc' }],
      });
      return records.map(toDomainMediaRendition);
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async deleteByAssetId(mediaAssetId: string, transaction?: TransactionContext): Promise<void> {
    const client = resolveClient(this.prisma, transaction);
    try {
      await client.mediaRendition.deleteMany({
        where: { mediaAssetId },
      });
    } catch (error) {
      throw mapPrismaError(error);
    }
  }
}
