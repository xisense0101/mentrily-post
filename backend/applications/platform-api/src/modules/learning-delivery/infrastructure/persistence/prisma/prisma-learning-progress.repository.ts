import { Inject, Injectable } from '@nestjs/common';
import { PrismaService, getPrismaClient, mapPrismaError } from '@mentrily/data-platform';
import { TransactionContext } from '@mentrily/service-core';
import { LearningProgressRepository } from '../../../domain/repositories/learning-progress.repository.js';
import { LearningProgress } from '../../../domain/entities/learning-progress.entity.js';
import { toDomainProgress, toPersistenceProgressCreate } from './learning-prisma.mapper.js';

@Injectable()
export class PrismaLearningProgressRepository implements LearningProgressRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async save(
    progress: LearningProgress,
    transaction?: TransactionContext,
  ): Promise<LearningProgress> {
    const client = getPrismaClient(this.prisma, transaction);
    try {
      await client.learningProgress.upsert({
        where: { id: progress.id },
        update: toPersistenceProgressCreate(progress),
        create: toPersistenceProgressCreate(progress),
      });
      const fresh = await client.learningProgress.findUnique({ where: { id: progress.id } });
      return toDomainProgress(fresh) as LearningProgress;
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async findByEnrollmentAndLesson(
    enrollmentId: string,
    lessonId: string,
    transaction?: TransactionContext,
  ): Promise<LearningProgress | null> {
    try {
      const client = getPrismaClient(this.prisma, transaction);
      const rec = await client.learningProgress.findUnique({
        where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
      });
      return rec ? toDomainProgress(rec) : null;
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async listByEnrollment(
    enrollmentId: string,
    transaction?: TransactionContext,
  ): Promise<LearningProgress[]> {
    try {
      const client = getPrismaClient(this.prisma, transaction);
      const recs = await client.learningProgress.findMany({
        where: { enrollmentId },
        orderBy: [{ lessonId: 'asc' }],
      });
      return recs.map((r) => toDomainProgress(r) as LearningProgress);
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async listCompletedByEnrollment(
    enrollmentId: string,
    transaction?: TransactionContext,
  ): Promise<LearningProgress[]> {
    try {
      const client = getPrismaClient(this.prisma, transaction);
      const recs = await client.learningProgress.findMany({
        where: { enrollmentId, status: 'COMPLETED' },
        orderBy: [{ lessonId: 'asc' }],
      });
      return recs.map((r) => toDomainProgress(r) as LearningProgress);
    } catch (error) {
      throw mapPrismaError(error);
    }
  }
}
