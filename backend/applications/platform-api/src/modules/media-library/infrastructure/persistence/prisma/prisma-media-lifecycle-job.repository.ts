import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import { PrismaService, getPrismaClient, mapPrismaError } from '@mentrily/data-platform';
import type { TransactionContext } from '@mentrily/service-core';
import { MediaLifecycleJobRepository } from '../../../domain/repositories/index.js';
import type { MediaLifecycleJob } from '../../../domain/index.js';
import {
  toDomainMediaLifecycleJob,
  toPersistenceMediaLifecycleJobCreate,
  toPersistenceMediaLifecycleJobUpdate,
} from './media-prisma.mapper.js';

type MediaPrismaClient = Pick<PrismaClient, 'mediaLifecycleJob'>;

function resolveClient(prisma: PrismaService, transaction?: TransactionContext): MediaPrismaClient {
  return getPrismaClient(prisma, transaction) as unknown as MediaPrismaClient;
}

@Injectable()
export class PrismaMediaLifecycleJobRepository implements MediaLifecycleJobRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async save(job: MediaLifecycleJob, transaction?: TransactionContext): Promise<MediaLifecycleJob> {
    const client = resolveClient(this.prisma, transaction);
    try {
      const record = await client.mediaLifecycleJob.upsert({
        where: { id: job.id },
        create: toPersistenceMediaLifecycleJobCreate(job),
        update: toPersistenceMediaLifecycleJobUpdate(job),
      });
      return toDomainMediaLifecycleJob(record);
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async findById(id: string, transaction?: TransactionContext): Promise<MediaLifecycleJob | null> {
    const client = resolveClient(this.prisma, transaction);
    try {
      const record = await client.mediaLifecycleJob.findUnique({ where: { id } });
      return record ? toDomainMediaLifecycleJob(record) : null;
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async findByAssetId(mediaAssetId: string, transaction?: TransactionContext): Promise<MediaLifecycleJob[]> {
    const client = resolveClient(this.prisma, transaction);
    try {
      const records = await client.mediaLifecycleJob.findMany({
        where: { mediaAssetId },
        orderBy: [{ createdAt: 'asc' }],
      });
      return records.map(toDomainMediaLifecycleJob);
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async claimDueJobs(
    input: { limit: number; workerId: string },
    transaction?: TransactionContext,
  ): Promise<MediaLifecycleJob[]> {
    const client = resolveClient(this.prisma, transaction);
    const now = new Date();

    try {
      const recordsToClaim = await client.mediaLifecycleJob.findMany({
        where: {
          status: { in: ['QUEUED', 'RETRYING'] },
          runAfter: { lte: now },
        },
        orderBy: { runAfter: 'asc' },
        take: input.limit,
      });

      return recordsToClaim.map(toDomainMediaLifecycleJob);
    } catch (error) {
      throw mapPrismaError(error);
    }
  }
}
