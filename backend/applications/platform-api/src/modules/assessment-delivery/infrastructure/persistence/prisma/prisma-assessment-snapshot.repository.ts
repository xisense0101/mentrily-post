import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import { PrismaService, getPrismaClient, mapPrismaError } from '@mentrily/data-platform';
import { TransactionContext } from '@mentrily/service-core';
import { AssessmentSnapshotRepository } from '../../../domain/repositories/index.js';
import { AssessmentPublishedSnapshot } from '../../../domain/entities/index.js';
import { toDomainSnapshot, toPersistenceSnapshotCreate } from './assessment-prisma.mapper.js';

type AssessmentSnapshotPrismaClient = Pick<PrismaClient, 'assessmentPublishedSnapshot'>;

function resolveSnapshotPrismaClient(
  prisma: PrismaService,
  transaction?: TransactionContext,
): AssessmentSnapshotPrismaClient {
  return getPrismaClient(prisma, transaction) as unknown as AssessmentSnapshotPrismaClient;
}

@Injectable()
export class PrismaAssessmentSnapshotRepository implements AssessmentSnapshotRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async save(
    snapshot: AssessmentPublishedSnapshot,
    transaction?: TransactionContext,
  ): Promise<AssessmentPublishedSnapshot> {
    const client = resolveSnapshotPrismaClient(this.prisma, transaction);

    try {
      const record = await client.assessmentPublishedSnapshot.create({
        data: toPersistenceSnapshotCreate(snapshot),
      });

      return toDomainSnapshot(record);
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async findLatestByAssessmentId(
    assessmentId: string,
    transaction?: TransactionContext,
  ): Promise<AssessmentPublishedSnapshot | null> {
    const client = resolveSnapshotPrismaClient(this.prisma, transaction);

    try {
      const record = await client.assessmentPublishedSnapshot.findFirst({
        where: { assessmentId },
        orderBy: { publishedAt: 'desc' },
      });

      return record ? toDomainSnapshot(record) : null;
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async findById(
    snapshotId: string,
    transaction?: TransactionContext,
  ): Promise<AssessmentPublishedSnapshot | null> {
    const client = resolveSnapshotPrismaClient(this.prisma, transaction);

    try {
      const record = await client.assessmentPublishedSnapshot.findUnique({
        where: { id: snapshotId },
      });

      return record ? toDomainSnapshot(record) : null;
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async listByAssessmentId(
    assessmentId: string,
    transaction?: TransactionContext,
  ): Promise<AssessmentPublishedSnapshot[]> {
    const client = resolveSnapshotPrismaClient(this.prisma, transaction);

    try {
      const records = await client.assessmentPublishedSnapshot.findMany({
        where: { assessmentId },
        orderBy: { publishedAt: 'desc' },
      });

      return records.map(toDomainSnapshot);
    } catch (error) {
      throw mapPrismaError(error);
    }
  }
}
