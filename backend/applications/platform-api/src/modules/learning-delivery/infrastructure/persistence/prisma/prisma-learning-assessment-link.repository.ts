import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import { PrismaService, getPrismaClient, mapPrismaError } from '@mentrily/data-platform';
import { TransactionContext } from '@mentrily/service-core';
import { LearningAssessmentLinkRepository } from '../../../domain/repositories/learning-assessment-link.repository.js';
import { LearningAssessmentLink } from '../../../domain/entities/learning-assessment-link.entity.js';
import {
  toDomainLearningAssessmentLink,
  toPersistenceLearningAssessmentLinkCreate,
  toPersistenceLearningAssessmentLinkUpdate,
} from './learning-assessment-link-prisma.mapper.js';

type LinkPrismaClient = Pick<PrismaClient, 'learningAssessmentLink'>;

function resolveClient(prisma: PrismaService, transaction?: TransactionContext): LinkPrismaClient {
  return getPrismaClient(prisma, transaction) as unknown as LinkPrismaClient;
}

@Injectable()
export class PrismaLearningAssessmentLinkRepository implements LearningAssessmentLinkRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async save(
    link: LearningAssessmentLink,
    transaction?: TransactionContext,
  ): Promise<LearningAssessmentLink> {
    const client = resolveClient(this.prisma, transaction);
    try {
      await client.learningAssessmentLink.upsert({
        where: { id: link.id },
        create: toPersistenceLearningAssessmentLinkCreate(link),
        update: toPersistenceLearningAssessmentLinkUpdate(link),
      });

      const fresh = await client.learningAssessmentLink.findUnique({ where: { id: link.id } });
      if (!fresh) {
        throw new Error(`learning assessment link ${link.id} was not found after save`);
      }

      return toDomainLearningAssessmentLink(fresh);
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async findById(
    id: string,
    transaction?: TransactionContext,
  ): Promise<LearningAssessmentLink | null> {
    const client = resolveClient(this.prisma, transaction);
    try {
      const record = await client.learningAssessmentLink.findUnique({ where: { id } });
      return record ? toDomainLearningAssessmentLink(record) : null;
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async findByCourseAndAssessment(
    input: { courseId: string; assessmentId: string; lessonId?: string | undefined },
    transaction?: TransactionContext,
  ): Promise<LearningAssessmentLink | null> {
    const client = resolveClient(this.prisma, transaction);
    try {
      const record = await client.learningAssessmentLink.findFirst({
        where: {
          courseId: input.courseId,
          assessmentId: input.assessmentId,
          ...(input.lessonId !== undefined ? { lessonId: input.lessonId } : { lessonId: null }),
        },
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      });
      return record ? toDomainLearningAssessmentLink(record) : null;
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async listByCourse(
    courseId: string,
    transaction?: TransactionContext,
  ): Promise<LearningAssessmentLink[]> {
    const client = resolveClient(this.prisma, transaction);
    try {
      const records = await client.learningAssessmentLink.findMany({
        where: { courseId },
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      });
      return records.map(toDomainLearningAssessmentLink);
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async listByLesson(
    lessonId: string,
    transaction?: TransactionContext,
  ): Promise<LearningAssessmentLink[]> {
    const client = resolveClient(this.prisma, transaction);
    try {
      const records = await client.learningAssessmentLink.findMany({
        where: { lessonId },
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      });
      return records.map(toDomainLearningAssessmentLink);
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async delete(id: string, transaction?: TransactionContext): Promise<void> {
    const client = resolveClient(this.prisma, transaction);
    try {
      await client.learningAssessmentLink.delete({ where: { id } });
    } catch (error) {
      throw mapPrismaError(error);
    }
  }
}
