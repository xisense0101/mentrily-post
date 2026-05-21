import { Prisma } from '@prisma/client';
import { AssessmentAnswerGrade, AssessmentGradingRun } from '../../../domain/entities/index.js';
import {
  AssessmentGradeScore,
  type AssessmentAnswerGradeStatus,
  type AssessmentGradingMethod,
  type AssessmentGradingRunStatus,
  type QuestionKind,
} from '../../../domain/value-objects/index.js';

type PersistenceAssessmentAnswerGrade = {
  id: string;
  gradingRunId: string;
  attemptId: string;
  answerId: string;
  questionId: string;
  questionKind: string;
  status: string;
  method: string;
  score: number | null;
  maxScore: number;
  feedback: unknown;
  gradedByPrincipalId: string | null;
  gradedAt: Date | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
};

type PersistenceAssessmentGradingRun = {
  id: string;
  tenantId: string;
  workspaceId: string;
  attemptId: string;
  assessmentId: string;
  snapshotId: string;
  triggeredByPrincipalId: string | null;
  status: string;
  startedAt: Date;
  completedAt: Date | null;
  failedAt: Date | null;
  error: string | null;
  totalScore: number | null;
  maxScore: number | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
  answerGrades?: PersistenceAssessmentAnswerGrade[];
};

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }
  return { ...(value as Record<string, unknown>) };
}

function toInputJsonValue(value: Record<string, unknown>): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export function toDomainAssessmentAnswerGrade(
  record: PersistenceAssessmentAnswerGrade,
): AssessmentAnswerGrade {
  return AssessmentAnswerGrade.restore({
    id: record.id,
    attemptId: record.attemptId,
    answerId: record.answerId,
    questionId: record.questionId,
    questionKind: record.questionKind as QuestionKind,
    status: record.status as AssessmentAnswerGradeStatus,
    method: record.method as AssessmentGradingMethod,
    ...(record.score !== null ? { score: AssessmentGradeScore.create(record.score) } : {}),
    maxScore: AssessmentGradeScore.create(record.maxScore),
    ...(record.feedback !== null && record.feedback !== undefined
      ? { feedback: asRecord(record.feedback) }
      : {}),
    ...(record.gradedByPrincipalId !== null
      ? { gradedByPrincipalId: record.gradedByPrincipalId }
      : {}),
    ...(record.gradedAt !== null ? { gradedAt: record.gradedAt } : {}),
    metadata: asRecord(record.metadata),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

export function toDomainAssessmentGradingRun(
  record: PersistenceAssessmentGradingRun,
): AssessmentGradingRun {
  const answerGrades = [...(record.answerGrades ?? [])]
    .sort((left, right) => {
      const byQuestion = left.questionId.localeCompare(right.questionId);
      if (byQuestion !== 0) {
        return byQuestion;
      }
      return left.answerId.localeCompare(right.answerId);
    })
    .map(toDomainAssessmentAnswerGrade);

  return AssessmentGradingRun.restore({
    id: record.id,
    tenantId: record.tenantId,
    workspaceId: record.workspaceId,
    attemptId: record.attemptId,
    assessmentId: record.assessmentId,
    snapshotId: record.snapshotId,
    ...(record.triggeredByPrincipalId !== null
      ? { triggeredByPrincipalId: record.triggeredByPrincipalId }
      : {}),
    status: record.status as AssessmentGradingRunStatus,
    startedAt: record.startedAt,
    ...(record.completedAt !== null ? { completedAt: record.completedAt } : {}),
    ...(record.failedAt !== null ? { failedAt: record.failedAt } : {}),
    ...(record.error !== null ? { error: record.error } : {}),
    answerGrades,
    ...(record.totalScore !== null
      ? { totalScore: AssessmentGradeScore.create(record.totalScore) }
      : {}),
    ...(record.maxScore !== null ? { maxScore: AssessmentGradeScore.create(record.maxScore) } : {}),
    metadata: asRecord(record.metadata),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

export function toPersistenceGradingRunCreate(
  run: AssessmentGradingRun,
): Prisma.AssessmentGradingRunUncheckedCreateInput {
  return {
    id: run.id,
    tenantId: run.tenantId,
    workspaceId: run.workspaceId,
    attemptId: run.attemptId,
    assessmentId: run.assessmentId,
    snapshotId: run.snapshotId,
    triggeredByPrincipalId: run.triggeredByPrincipalId ?? null,
    status: run.status,
    startedAt: run.startedAt,
    completedAt: run.completedAt ?? null,
    failedAt: run.failedAt ?? null,
    error: run.error ?? null,
    totalScore: run.totalScore?.value ?? null,
    maxScore: run.maxScore?.value ?? null,
    metadata: toInputJsonValue(run.metadata),
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
  };
}

export function toPersistenceGradingRunUpdate(
  run: AssessmentGradingRun,
): Prisma.AssessmentGradingRunUncheckedUpdateInput {
  return {
    triggeredByPrincipalId: run.triggeredByPrincipalId ?? null,
    status: run.status,
    completedAt: run.completedAt ?? null,
    failedAt: run.failedAt ?? null,
    error: run.error ?? null,
    totalScore: run.totalScore?.value ?? null,
    maxScore: run.maxScore?.value ?? null,
    metadata: toInputJsonValue(run.metadata),
    updatedAt: run.updatedAt,
  };
}

export function toPersistenceAnswerGradeCreate(
  runId: string,
  grade: AssessmentAnswerGrade,
): Prisma.AssessmentAnswerGradeUncheckedCreateInput {
  return {
    id: grade.id,
    gradingRunId: runId,
    attemptId: grade.attemptId,
    answerId: grade.answerId,
    questionId: grade.questionId,
    questionKind: grade.questionKind,
    status: grade.status,
    method: grade.method,
    score: grade.score?.value ?? null,
    maxScore: grade.maxScore.value,
    feedback: grade.feedback ? toInputJsonValue(grade.feedback) : Prisma.DbNull,
    gradedByPrincipalId: grade.gradedByPrincipalId ?? null,
    gradedAt: grade.gradedAt ?? null,
    metadata: toInputJsonValue(grade.metadata),
    createdAt: grade.createdAt,
    updatedAt: grade.updatedAt,
  };
}

export function toPersistenceAnswerGradeUpdate(
  grade: AssessmentAnswerGrade,
): Prisma.AssessmentAnswerGradeUncheckedUpdateInput {
  return {
    status: grade.status,
    method: grade.method,
    score: grade.score?.value ?? null,
    maxScore: grade.maxScore.value,
    feedback: grade.feedback ? toInputJsonValue(grade.feedback) : Prisma.DbNull,
    gradedByPrincipalId: grade.gradedByPrincipalId ?? null,
    gradedAt: grade.gradedAt ?? null,
    metadata: toInputJsonValue(grade.metadata),
    updatedAt: grade.updatedAt,
  };
}
