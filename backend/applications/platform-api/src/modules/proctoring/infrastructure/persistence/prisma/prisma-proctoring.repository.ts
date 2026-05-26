import { Inject, Injectable } from '@nestjs/common';
import { Prisma, type PrismaClient, type AssessmentProctoringEventSeverity } from '@prisma/client';
import {
  DataError,
  DataErrorType,
  PrismaService,
  getPrismaClient,
  mapPrismaError,
} from '@mentrily/data-platform';
import { TransactionContext } from '@mentrily/service-core';
import {
  ProctoringEventRepository,
  ProctoringSessionRepository,
} from '../../../application/proctoring.repository.js';
import type {
  ProctoringEventRecord,
  ProctoringSessionRecord,
} from '../../../application/proctoring.types.js';

type ProctoringPrismaClient = Pick<
  PrismaClient,
  'assessmentProctoringSession' | 'assessmentProctoringEvent'
>;

function resolveClient(
  prisma: PrismaService,
  transaction?: TransactionContext,
): ProctoringPrismaClient {
  return getPrismaClient(prisma, transaction) as unknown as ProctoringPrismaClient;
}

function asRecord(value: Prisma.JsonValue): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }
  return { ...(value as Record<string, unknown>) };
}

function severityRank(severity: AssessmentProctoringEventSeverity): number {
  switch (severity) {
    case 'INFO':
      return 0;
    case 'LOW':
      return 1;
    case 'MEDIUM':
      return 2;
    case 'HIGH':
      return 3;
  }
  return 0;
}

@Injectable()
export class PrismaProctoringSessionRepository implements ProctoringSessionRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(
    input: Parameters<ProctoringSessionRepository['create']>[0],
    transaction?: TransactionContext,
  ) {
    try {
      const session = await resolveClient(
        this.prisma,
        transaction,
      ).assessmentProctoringSession.create({
        data: input,
      });
      return session as ProctoringSessionRecord;
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async update(
    sessionId: string,
    input: Parameters<ProctoringSessionRepository['update']>[1],
    transaction?: TransactionContext,
  ) {
    try {
      const session = await resolveClient(
        this.prisma,
        transaction,
      ).assessmentProctoringSession.update({
        where: { id: sessionId },
        data: input,
      });
      return session as ProctoringSessionRecord;
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async findById(sessionId: string, transaction?: TransactionContext) {
    try {
      const session = await resolveClient(
        this.prisma,
        transaction,
      ).assessmentProctoringSession.findUnique({
        where: { id: sessionId },
      });
      return session as ProctoringSessionRecord | null;
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async findLatestByAttempt(attemptId: string, transaction?: TransactionContext) {
    try {
      const session = await resolveClient(
        this.prisma,
        transaction,
      ).assessmentProctoringSession.findFirst({
        where: { attemptId },
        orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
      });
      return session as ProctoringSessionRecord | null;
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async listActiveByAssessment(
    workspaceId: string,
    assessmentId: string,
    transaction?: TransactionContext,
  ) {
    try {
      const sessions = await resolveClient(
        this.prisma,
        transaction,
      ).assessmentProctoringSession.findMany({
        where: {
          workspaceId,
          assessmentId,
          status: { in: ['PENDING', 'ACTIVE'] },
        },
        orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
      });
      return sessions as ProctoringSessionRecord[];
    } catch (error) {
      throw mapPrismaError(error);
    }
  }
}

@Injectable()
export class PrismaProctoringEventRepository implements ProctoringEventRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(
    input: Parameters<ProctoringEventRepository['create']>[0],
    transaction?: TransactionContext,
  ) {
    const client = resolveClient(this.prisma, transaction);
    try {
      const event = await client.assessmentProctoringEvent.create({
        data: {
          ...input,
          eventId: input.eventId ?? null,
          metadata: input.metadata as Prisma.InputJsonValue,
        },
      });
      return { event: { ...event, metadata: asRecord(event.metadata) }, duplicate: false };
    } catch (error) {
      const mapped = mapPrismaError(error);
      if (
        input.eventId &&
        mapped instanceof DataError &&
        mapped.type === DataErrorType.UNIQUE_VIOLATION
      ) {
        const event = await client.assessmentProctoringEvent.findUnique({
          where: {
            workspaceId_sessionId_eventId: {
              workspaceId: input.workspaceId,
              sessionId: input.sessionId,
              eventId: input.eventId,
            },
          },
        });
        if (event) {
          return { event: { ...event, metadata: asRecord(event.metadata) }, duplicate: true };
        }
      }
      throw mapped;
    }
  }

  async countRecentBySession(sessionId: string, since: Date, transaction?: TransactionContext) {
    try {
      return await resolveClient(this.prisma, transaction).assessmentProctoringEvent.count({
        where: { sessionId, receivedAt: { gte: since } },
      });
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async listByAttempt(workspaceId: string, attemptId: string, transaction?: TransactionContext) {
    try {
      const events = await resolveClient(
        this.prisma,
        transaction,
      ).assessmentProctoringEvent.findMany({
        where: { workspaceId, attemptId },
        orderBy: [{ occurredAt: 'asc' }, { receivedAt: 'asc' }, { id: 'asc' }],
      });
      return events.map((event) => ({
        ...event,
        metadata: asRecord(event.metadata),
      })) as ProctoringEventRecord[];
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async countBySessionAndSeverityAtLeast(
    sessionIds: string[],
    severity: AssessmentProctoringEventSeverity,
    transaction?: TransactionContext,
  ) {
    const counts = new Map<string, number>();
    if (sessionIds.length === 0) {
      return counts;
    }

    try {
      const events = await resolveClient(
        this.prisma,
        transaction,
      ).assessmentProctoringEvent.findMany({
        where: { sessionId: { in: sessionIds } },
        select: { sessionId: true, severity: true },
      });
      for (const event of events) {
        if (severityRank(event.severity) < severityRank(severity)) {
          continue;
        }
        counts.set(event.sessionId, (counts.get(event.sessionId) ?? 0) + 1);
      }
      return counts;
    } catch (error) {
      throw mapPrismaError(error);
    }
  }
}
