import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import { PrismaService, getPrismaClient, mapPrismaError } from '@mentrily/data-platform';
import type { TransactionContext } from '@mentrily/service-core';
import { MediaSecurityScanJobRepository } from '../../../domain/repositories/index.js';
import type { MediaSecurityScanJob } from '../../../domain/index.js';
import {
  toDomainMediaSecurityScanJob,
  toPersistenceMediaSecurityScanJobCreate,
  toPersistenceMediaSecurityScanJobUpdate,
} from './media-prisma.mapper.js';

type MediaPrismaClient = Pick<PrismaClient, 'mediaSecurityScanJob'>;

function resolveClient(prisma: PrismaService, transaction?: TransactionContext): MediaPrismaClient {
  return getPrismaClient(prisma, transaction) as unknown as MediaPrismaClient;
}

@Injectable()
export class PrismaMediaSecurityScanJobRepository implements MediaSecurityScanJobRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async save(job: MediaSecurityScanJob, transaction?: TransactionContext): Promise<MediaSecurityScanJob> {
    const client = resolveClient(this.prisma, transaction);
    try {
      const record = await client.mediaSecurityScanJob.upsert({
        where: { id: job.id },
        create: toPersistenceMediaSecurityScanJobCreate(job),
        update: toPersistenceMediaSecurityScanJobUpdate(job),
      });
      return toDomainMediaSecurityScanJob(record);
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async findById(id: string, transaction?: TransactionContext): Promise<MediaSecurityScanJob | null> {
    const client = resolveClient(this.prisma, transaction);
    try {
      const record = await client.mediaSecurityScanJob.findUnique({ where: { id } });
      return record ? toDomainMediaSecurityScanJob(record) : null;
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async findByAssetId(mediaAssetId: string, transaction?: TransactionContext): Promise<MediaSecurityScanJob[]> {
    const client = resolveClient(this.prisma, transaction);
    try {
      const records = await client.mediaSecurityScanJob.findMany({
        where: { mediaAssetId },
        orderBy: [{ createdAt: 'asc' }],
      });
      return records.map(toDomainMediaSecurityScanJob);
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async claimDueJobs(
    input: { limit: number; workerId: string },
    transaction?: TransactionContext,
  ): Promise<MediaSecurityScanJob[]> {
    const client = resolveClient(this.prisma, transaction);
    const now = new Date();

    try {
      const recordsToClaim = await client.mediaSecurityScanJob.findMany({
        where: {
          status: { in: ['QUEUED', 'RETRYING'] },
          runAfter: { lte: now },
        },
        orderBy: { runAfter: 'asc' },
        take: input.limit,
      });

      return recordsToClaim.map(toDomainMediaSecurityScanJob);
    } catch (error) {
      throw mapPrismaError(error);
    }
  }
}
