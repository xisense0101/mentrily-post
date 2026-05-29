/**
 * PrismaAssessmentAttemptRepository
 * Concrete implementation of AssessmentAttemptRepository using Prisma.
 * Saves attempt aggregate with session, answers, and result in one transaction.
 */

import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import { PrismaService, getPrismaClient, mapPrismaError } from '@mentrily/data-platform';
import { TransactionContext } from '@mentrily/service-core';
import { AssessmentAttemptRepository } from '../../../domain/repositories/index.js';
import { AssessmentAttempt } from '../../../domain/entities/index.js';
import {
  toDomainAttempt,
  toPersistenceAttemptCreate,
  toPersistenceAttemptUpdate,
  toPersistenceSessionUpsert,
  toPersistenceAnswerUpsertCreate,
  toPersistenceAnswerUpsertUpdate,
  toPersistenceResultUpsert,
} from './assessment-attempt-prisma.mapper.js';

type AttemptPrismaClient = Pick<
  PrismaClient,
  | 'assessmentAttempt'
  | 'assessmentAttemptAnswer'
  | 'assessmentAttemptSession'
  | 'assessmentAttemptResult'
>;

function resolveClient(
  prisma: PrismaService,
  transaction?: TransactionContext,
): AttemptPrismaClient {
  return getPrismaClient(prisma, transaction) as unknown as AttemptPrismaClient;
}

const fullInclude = {
  answers: {
    orderBy: [{ questionId: 'asc' as const }, { id: 'asc' as const }] as Array<{
      questionId?: 'asc' | 'desc';
      id?: 'asc' | 'desc';
    }>,
  },
  session: true as const,
  result: true as const,
};

@Injectable()
export class PrismaAssessmentAttemptRepository implements AssessmentAttemptRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async save(
    attempt: AssessmentAttempt,
    transaction?: TransactionContext,
  ): Promise<AssessmentAttempt> {
    const client = resolveClient(this.prisma, transaction);

    try {
      // 1. Upsert attempt
      await client.assessmentAttempt.upsert({
        where: { id: attempt.id },
        create: toPersistenceAttemptCreate(attempt),
        update: toPersistenceAttemptUpdate(attempt),
      });

      // 2. Upsert session
      const sessionUpsert = toPersistenceSessionUpsert(attempt.session);
      await client.assessmentAttemptSession.upsert({
        where: { attemptId: attempt.id },
        create: sessionUpsert.create,
        update: sessionUpsert.update,
      });

      // 3. Upsert answers
      for (const answer of attempt.answers) {
        await client.assessmentAttemptAnswer.upsert({
          where: { attemptId_questionId: { attemptId: attempt.id, questionId: answer.questionId } },
          create: toPersistenceAnswerUpsertCreate(answer),
          update: toPersistenceAnswerUpsertUpdate(answer),
        });
      }

      // 4. Upsert result if present
      if (attempt.result) {
        const resultUpsert = toPersistenceResultUpsert(attempt.result);
        await client.assessmentAttemptResult.upsert({
          where: { attemptId: attempt.id },
          create: resultUpsert.create,
          update: resultUpsert.update,
        });
      }

      // 5. Reload fresh aggregate
      const fresh = await this.loadFull(attempt.id, transaction);
      if (!fresh) {
        throw new Error(`AssessmentAttempt ${attempt.id} not found after save`);
      }

      return fresh;
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async findById(id: string, transaction?: TransactionContext): Promise<AssessmentAttempt | null> {
    try {
      return await this.loadFull(id, transaction);
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async listByLearner(
    input: { workspaceId: string; learnerPrincipalId: string },
    transaction?: TransactionContext,
  ): Promise<AssessmentAttempt[]> {
    const client = resolveClient(this.prisma, transaction);
    try {
      const records = await client.assessmentAttempt.findMany({
        where: { workspaceId: input.workspaceId, learnerPrincipalId: input.learnerPrincipalId },
        orderBy: [{ startedAt: 'desc' }, { id: 'asc' }],
        include: fullInclude,
      });
      return records.map(toDomainAttempt);
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async listByAssessmentAndLearner(
    input: { assessmentId: string; learnerPrincipalId: string },
    transaction?: TransactionContext,
  ): Promise<AssessmentAttempt[]> {
    const client = resolveClient(this.prisma, transaction);
    try {
      const records = await client.assessmentAttempt.findMany({
        where: { assessmentId: input.assessmentId, learnerPrincipalId: input.learnerPrincipalId },
        orderBy: [{ startedAt: 'desc' }, { id: 'asc' }],
        include: fullInclude,
      });
      return records.map(toDomainAttempt);
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async findInProgressByAssessmentAndLearner(
    input: { assessmentId: string; learnerPrincipalId: string },
    transaction?: TransactionContext,
  ): Promise<AssessmentAttempt | null> {
    const client = resolveClient(this.prisma, transaction);
    try {
      const record = await client.assessmentAttempt.findFirst({
        where: {
          assessmentId: input.assessmentId,
          learnerPrincipalId: input.learnerPrincipalId,
          status: 'IN_PROGRESS',
        },
        orderBy: [{ startedAt: 'desc' }, { id: 'asc' }],
        include: fullInclude,
      });
      return record ? toDomainAttempt(record) : null;
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async acquireRowLock(id: string, transaction: TransactionContext): Promise<void> {
    const tx = transaction.client as any;
    if (!tx || typeof tx.$queryRawUnsafe !== 'function') {
      return;
    }
    try {
      await tx.$queryRawUnsafe(
        `SELECT 1 FROM "AssessmentAttempt" WHERE "id" = $1::uuid FOR UPDATE;`,
        id,
      );
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  private async loadFull(
    id: string,
    transaction?: TransactionContext,
  ): Promise<AssessmentAttempt | null> {
    const client = resolveClient(this.prisma, transaction);
    const record = await client.assessmentAttempt.findUnique({
      where: { id },
      include: fullInclude,
    });
    return record ? toDomainAttempt(record) : null;
  }
}
