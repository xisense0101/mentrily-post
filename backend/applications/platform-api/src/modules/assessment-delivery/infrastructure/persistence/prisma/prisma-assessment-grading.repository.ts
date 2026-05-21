import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import { PrismaService, getPrismaClient, mapPrismaError } from '@mentrily/data-platform';
import { TransactionContext } from '@mentrily/service-core';
import { AssessmentAnswerGrade, AssessmentGradingRun } from '../../../domain/entities/index.js';
import { AssessmentGradingRepository } from '../../../domain/repositories/index.js';
import {
  toDomainAssessmentAnswerGrade,
  toDomainAssessmentGradingRun,
  toPersistenceAnswerGradeCreate,
  toPersistenceAnswerGradeUpdate,
  toPersistenceGradingRunCreate,
  toPersistenceGradingRunUpdate,
} from './assessment-grading-prisma.mapper.js';

type GradingPrismaClient = Pick<PrismaClient, 'assessmentGradingRun' | 'assessmentAnswerGrade'>;

function resolveClient(
  prisma: PrismaService,
  transaction?: TransactionContext,
): GradingPrismaClient {
  return getPrismaClient(prisma, transaction) as unknown as GradingPrismaClient;
}

const gradingRunInclude = {
  answerGrades: {
    orderBy: [{ questionId: 'asc' as const }, { answerId: 'asc' as const }],
  },
};

@Injectable()
export class PrismaAssessmentGradingRepository implements AssessmentGradingRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async saveRun(
    run: AssessmentGradingRun,
    transaction?: TransactionContext,
  ): Promise<AssessmentGradingRun> {
    const client = resolveClient(this.prisma, transaction);
    try {
      await client.assessmentGradingRun.upsert({
        where: { id: run.id },
        create: toPersistenceGradingRunCreate(run),
        update: toPersistenceGradingRunUpdate(run),
      });

      for (const grade of run.answerGrades) {
        await client.assessmentAnswerGrade.upsert({
          where: { gradingRunId_answerId: { gradingRunId: run.id, answerId: grade.answerId } },
          create: toPersistenceAnswerGradeCreate(run.id, grade),
          update: toPersistenceAnswerGradeUpdate(grade),
        });
      }

      const saved = await this.findRunById(run.id, transaction);
      if (!saved) {
        throw new Error(`AssessmentGradingRun ${run.id} not found after save`);
      }
      return saved;
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async findRunById(
    runId: string,
    transaction?: TransactionContext,
  ): Promise<AssessmentGradingRun | null> {
    const client = resolveClient(this.prisma, transaction);
    try {
      const record = await client.assessmentGradingRun.findUnique({
        where: { id: runId },
        include: gradingRunInclude,
      });
      return record ? toDomainAssessmentGradingRun(record) : null;
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async findLatestRunByAttemptId(
    attemptId: string,
    transaction?: TransactionContext,
  ): Promise<AssessmentGradingRun | null> {
    const client = resolveClient(this.prisma, transaction);
    try {
      const record = await client.assessmentGradingRun.findFirst({
        where: { attemptId },
        orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
        include: gradingRunInclude,
      });
      return record ? toDomainAssessmentGradingRun(record) : null;
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async listRunsByAttemptId(
    attemptId: string,
    transaction?: TransactionContext,
  ): Promise<AssessmentGradingRun[]> {
    const client = resolveClient(this.prisma, transaction);
    try {
      const records = await client.assessmentGradingRun.findMany({
        where: { attemptId },
        orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
        include: gradingRunInclude,
      });
      return records.map(toDomainAssessmentGradingRun);
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async listPendingManualReview(
    input: { workspaceId: string },
    transaction?: TransactionContext,
  ): Promise<AssessmentAnswerGrade[]> {
    const client = resolveClient(this.prisma, transaction);
    try {
      const records = await client.assessmentAnswerGrade.findMany({
        where: {
          status: 'PENDING_MANUAL_REVIEW',
          gradingRun: {
            workspaceId: input.workspaceId,
          },
        },
        orderBy: [{ gradedAt: 'asc' }, { questionId: 'asc' }, { answerId: 'asc' }],
      });
      return records.map(toDomainAssessmentAnswerGrade);
    } catch (error) {
      throw mapPrismaError(error);
    }
  }
}
