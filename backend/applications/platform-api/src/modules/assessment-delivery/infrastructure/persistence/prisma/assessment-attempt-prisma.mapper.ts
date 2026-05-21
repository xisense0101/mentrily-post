/**
 * AssessmentAttempt Prisma Mapper
 * Maps between Prisma persistence records and domain entities.
 * No any types, no Prisma imports into domain.
 */

import {
  Prisma,
  type AssessmentAttemptStatus as PrismaAssessmentAttemptStatus,
} from '@prisma/client';
import {
  AssessmentAttempt,
  AssessmentAttemptAnswer,
  AssessmentAttemptSession,
  AssessmentAttemptResult,
} from '../../../domain/entities/index.js';
import {
  AssessmentAttemptScore,
  AssessmentAttemptStatusEnum,
} from '../../../domain/value-objects/index.js';

// --- Persistence types (structural, no Prisma model imports into domain) ---

type PersistenceAttemptAnswer = {
  id: string;
  attemptId: string;
  questionId: string;
  questionKind: string;
  answer: unknown;
  status: string;
  savedAt: Date;
  submittedAt: Date | null;
  metadata: unknown;
};

type PersistenceAttemptSession = {
  id: string;
  attemptId: string;
  startedAt: Date;
  lastSeenAt: Date;
  expiresAt: Date | null;
  submittedAt: Date | null;
  metadata: unknown;
};

type PersistenceAttemptResult = {
  id: string;
  attemptId: string;
  gradingStatus: string;
  score: number | null;
  maxScore: number | null;
  releasedAt: Date | null;
  feedback: unknown;
  createdAt: Date;
  updatedAt: Date;
};

export type PersistenceAttempt = {
  id: string;
  tenantId: string;
  workspaceId: string;
  assessmentId: string;
  snapshotId: string;
  snapshotVersionId: string;
  snapshotVersionNumber: number;
  learnerPrincipalId: string;
  status: string;
  startedAt: Date;
  submittedAt: Date | null;
  expiresAt: Date | null;
  cancelledAt: Date | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
  answers?: PersistenceAttemptAnswer[];
  session?: PersistenceAttemptSession | null;
  result?: PersistenceAttemptResult | null;
};

// --- Safe helpers ---

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }
  return { ...(value as Record<string, unknown>) };
}

function toInputJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function toPersistenceStatus(
  status: import('../../../domain/value-objects/index.js').AssessmentAttemptStatus,
): PrismaAssessmentAttemptStatus {
  if (status === AssessmentAttemptStatusEnum.NOT_STARTED) {
    throw new Error('NOT_STARTED attempts cannot be persisted');
  }
  return status;
}

// --- Domain mappers ---

export function toDomainAttemptAnswer(record: PersistenceAttemptAnswer): AssessmentAttemptAnswer {
  return AssessmentAttemptAnswer.restore({
    id: record.id,
    attemptId: record.attemptId,
    questionId: record.questionId,
    questionKind:
      record.questionKind as import('../../../domain/value-objects/index.js').QuestionKind,
    answer: asRecord(record.answer),
    status:
      record.status as import('../../../domain/value-objects/index.js').AssessmentAttemptAnswerStatus,
    savedAt: record.savedAt,
    ...(record.submittedAt !== null ? { submittedAt: record.submittedAt } : {}),
    metadata: asRecord(record.metadata),
  });
}

export function toDomainAttemptSession(
  record: PersistenceAttemptSession,
): AssessmentAttemptSession {
  return AssessmentAttemptSession.restore({
    id: record.id,
    attemptId: record.attemptId,
    startedAt: record.startedAt,
    lastSeenAt: record.lastSeenAt,
    ...(record.expiresAt !== null ? { expiresAt: record.expiresAt } : {}),
    ...(record.submittedAt !== null ? { submittedAt: record.submittedAt } : {}),
    metadata: asRecord(record.metadata),
  });
}

export function toDomainAttemptResult(record: PersistenceAttemptResult): AssessmentAttemptResult {
  return AssessmentAttemptResult.restore({
    id: record.id,
    attemptId: record.attemptId,
    gradingStatus:
      record.gradingStatus as import('../../../domain/value-objects/index.js').AssessmentAttemptGradingStatus,
    ...(record.score !== null ? { score: AssessmentAttemptScore.create(record.score) } : {}),
    ...(record.maxScore !== null
      ? { maxScore: AssessmentAttemptScore.create(record.maxScore) }
      : {}),
    ...(record.releasedAt !== null ? { releasedAt: record.releasedAt } : {}),
    ...(record.feedback !== null && record.feedback !== undefined
      ? { feedback: asRecord(record.feedback) }
      : {}),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

export function toDomainAttempt(record: PersistenceAttempt): AssessmentAttempt {
  // Sort answers deterministically by questionId then id
  const sortedAnswers = [...(record.answers ?? [])].sort((a, b) => {
    const byCq = a.questionId.localeCompare(b.questionId);
    if (byCq !== 0) return byCq;
    return a.id.localeCompare(b.id);
  });

  const answers = sortedAnswers.map(toDomainAttemptAnswer);

  if (!record.session) {
    throw new Error(`AssessmentAttempt ${record.id} has no session in persistence`);
  }
  const session = toDomainAttemptSession(record.session);
  const result = record.result ? toDomainAttemptResult(record.result) : undefined;

  const attempt = AssessmentAttempt.restore({
    id: record.id,
    tenantId: record.tenantId,
    workspaceId: record.workspaceId,
    assessmentId: record.assessmentId,
    snapshotId: record.snapshotId,
    snapshotVersionId: record.snapshotVersionId,
    snapshotVersionNumber: record.snapshotVersionNumber,
    learnerPrincipalId: record.learnerPrincipalId,
    status:
      record.status as import('../../../domain/value-objects/index.js').AssessmentAttemptStatus,
    session,
    answers,
    ...(result !== undefined ? { result } : {}),
    startedAt: record.startedAt,
    ...(record.submittedAt !== null ? { submittedAt: record.submittedAt } : {}),
    ...(record.expiresAt !== null ? { expiresAt: record.expiresAt } : {}),
    ...(record.cancelledAt !== null ? { cancelledAt: record.cancelledAt } : {}),
    metadata: asRecord(record.metadata),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });

  return attempt;
}

// --- Persistence mappers ---

export function toPersistenceAttemptCreate(
  attempt: AssessmentAttempt,
): Prisma.AssessmentAttemptUncheckedCreateInput {
  return {
    id: attempt.id,
    tenantId: attempt.tenantId,
    workspaceId: attempt.workspaceId,
    assessmentId: attempt.assessmentId,
    snapshotId: attempt.snapshotId,
    snapshotVersionId: attempt.snapshotVersionId,
    snapshotVersionNumber: attempt.snapshotVersionNumber,
    learnerPrincipalId: attempt.learnerPrincipalId,
    status: toPersistenceStatus(attempt.status),
    startedAt: attempt.startedAt,
    submittedAt: attempt.submittedAt ?? null,
    expiresAt: attempt.expiresAt ?? null,
    cancelledAt: attempt.cancelledAt ?? null,
    metadata: toInputJsonValue(attempt.metadata),
    createdAt: attempt.createdAt,
    updatedAt: attempt.updatedAt,
  };
}

export function toPersistenceAttemptUpdate(
  attempt: AssessmentAttempt,
): Prisma.AssessmentAttemptUncheckedUpdateInput {
  return {
    status: toPersistenceStatus(attempt.status),
    submittedAt: attempt.submittedAt ?? null,
    expiresAt: attempt.expiresAt ?? null,
    cancelledAt: attempt.cancelledAt ?? null,
    metadata: toInputJsonValue(attempt.metadata),
    updatedAt: attempt.updatedAt,
  };
}

export function toPersistenceSessionUpsert(session: AssessmentAttemptSession): {
  create: Prisma.AssessmentAttemptSessionUncheckedCreateInput;
  update: Prisma.AssessmentAttemptSessionUncheckedUpdateInput;
} {
  return {
    create: {
      id: session.id,
      attemptId: session.attemptId,
      startedAt: session.startedAt,
      lastSeenAt: session.lastSeenAt,
      expiresAt: session.expiresAt ?? null,
      submittedAt: session.submittedAt ?? null,
      metadata: toInputJsonValue(session.metadata),
    },
    update: {
      lastSeenAt: session.lastSeenAt,
      expiresAt: session.expiresAt ?? null,
      submittedAt: session.submittedAt ?? null,
      metadata: toInputJsonValue(session.metadata),
    },
  };
}

export function toPersistenceAnswerUpsertCreate(
  answer: AssessmentAttemptAnswer,
): Prisma.AssessmentAttemptAnswerUncheckedCreateInput {
  return {
    id: answer.id,
    attemptId: answer.attemptId,
    questionId: answer.questionId,
    questionKind: answer.questionKind,
    answer: toInputJsonValue(answer.answer),
    status: answer.status,
    savedAt: answer.savedAt,
    submittedAt: answer.submittedAt ?? null,
    metadata: toInputJsonValue(answer.metadata),
  };
}

export function toPersistenceAnswerUpsertUpdate(
  answer: AssessmentAttemptAnswer,
): Prisma.AssessmentAttemptAnswerUncheckedUpdateInput {
  return {
    answer: toInputJsonValue(answer.answer),
    status: answer.status,
    savedAt: answer.savedAt,
    submittedAt: answer.submittedAt ?? null,
    metadata: toInputJsonValue(answer.metadata),
  };
}

export function toPersistenceResultUpsert(result: AssessmentAttemptResult): {
  create: Prisma.AssessmentAttemptResultUncheckedCreateInput;
  update: Prisma.AssessmentAttemptResultUncheckedUpdateInput;
} {
  const feedbackCreate =
    result.feedback !== undefined ? toInputJsonValue(result.feedback) : Prisma.JsonNull;
  const feedbackUpdate =
    result.feedback !== undefined ? toInputJsonValue(result.feedback) : Prisma.JsonNull;
  return {
    create: {
      id: result.id,
      attemptId: result.attemptId,
      gradingStatus: result.gradingStatus,
      score: result.score?.value ?? null,
      maxScore: result.maxScore?.value ?? null,
      releasedAt: result.releasedAt ?? null,
      feedback: feedbackCreate,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    },
    update: {
      gradingStatus: result.gradingStatus,
      score: result.score?.value ?? null,
      maxScore: result.maxScore?.value ?? null,
      releasedAt: result.releasedAt ?? null,
      feedback: feedbackUpdate,
      updatedAt: result.updatedAt,
    },
  };
}
