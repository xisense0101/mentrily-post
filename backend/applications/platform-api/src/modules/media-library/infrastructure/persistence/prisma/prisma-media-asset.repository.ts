import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import { PrismaService, getPrismaClient, mapPrismaError } from '@mentrily/data-platform';
import type { TransactionContext } from '@mentrily/service-core';
import { MediaAssetRepository } from '../../../domain/repositories/index.js';
import type { MediaAsset, MediaAssetStatus, MediaFileCategory } from '../../../domain/index.js';
import {
  toDomainMediaAsset,
  toPersistenceMediaAssetCreate,
  toPersistenceMediaAssetUpdate,
} from './media-prisma.mapper.js';

type MediaPrismaClient = Pick<PrismaClient, 'mediaAsset'>;

function resolveClient(prisma: PrismaService, transaction?: TransactionContext): MediaPrismaClient {
  return getPrismaClient(prisma, transaction) as unknown as MediaPrismaClient;
}

@Injectable()
export class PrismaMediaAssetRepository implements MediaAssetRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async save(asset: MediaAsset, transaction?: TransactionContext): Promise<MediaAsset> {
    const client = resolveClient(this.prisma, transaction);
    try {
      const record = await client.mediaAsset.upsert({
        where: { id: asset.id },
        create: toPersistenceMediaAssetCreate(asset),
        update: toPersistenceMediaAssetUpdate(asset),
      });
      return toDomainMediaAsset(record);
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async findById(id: string, transaction?: TransactionContext): Promise<MediaAsset | null> {
    const client = resolveClient(this.prisma, transaction);
    try {
      const record = await client.mediaAsset.findUnique({ where: { id } });
      return record ? toDomainMediaAsset(record) : null;
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async listByWorkspace(
    input: {
      workspaceId: string;
      status?: MediaAssetStatus | undefined;
      fileCategory?: MediaFileCategory | undefined;
      ownerPrincipalId?: string | undefined;
    },
    transaction?: TransactionContext,
  ): Promise<MediaAsset[]> {
    const client = resolveClient(this.prisma, transaction);
    try {
      const records = await client.mediaAsset.findMany({
        where: {
          workspaceId: input.workspaceId,
          ...(input.status ? { status: input.status } : {}),
          ...(input.fileCategory ? { fileCategory: input.fileCategory } : {}),
          ...(input.ownerPrincipalId ? { ownerPrincipalId: input.ownerPrincipalId } : {}),
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      });
      return records.map(toDomainMediaAsset);
    } catch (error) {
      throw mapPrismaError(error);
    }
  }
}
