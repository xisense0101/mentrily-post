import { describe, expect, it, vi } from 'vitest';
import {
  AuditRecorder,
  OutboxPublisher,
  PermissionEvaluator,
  TransactionContext,
  TransactionRunner,
} from '@mentrily/service-core';
import { AssessmentAttemptRepository, AssessmentGradingRepository } from '../domain/repositories/index.js';
import {
  AssessmentAnswerGrade,
  AssessmentAttempt,
  AssessmentGradeScore,
  AssessmentGradingRun,
} from '../domain/index.js';
import { AssessmentEventPublisherService } from '../application/services/index.js';
import { ManualGradeAssessmentAnswerUseCase } from '../application/use-cases/index.js';
import {
  TEST_ACTOR_ID,
  TEST_TENANT_ID,
  TEST_WORKSPACE_ID,
  createAssessmentRequestContext,
} from './assessment-test-fixtures.js';

function createPermissionEvaluator(allowed: boolean): PermissionEvaluator {
  return { evaluate: vi.fn(async () => ({ allowed })) };
}

function createTransactionRunner(tx: TransactionContext): TransactionRunner {
  return { run: vi.fn(async (operation) => operation(tx)) };
}

function createAuditRecorder(): AuditRecorder {
  return { record: vi.fn(async () => undefined) };
}

function createRunAndAttempt() {
  const attempt = AssessmentAttempt.start({
    id: 'attempt-1',
    tenantId: TEST_TENANT_ID,
    workspaceId: TEST_WORKSPACE_ID,
    assessmentId: 'assessment-1',
    snapshotId: 'snapshot-1',
    snapshotVersionId: 'version-1',
    snapshotVersionNumber: 1,
    learnerPrincipalId: TEST_ACTOR_ID,
    sessionId: 'session-1',
  });
  attempt.submit('result-1');
  attempt.result?.markPendingManualReview();

  const run = AssessmentGradingRun.start({
    id: 'run-1',
    tenantId: TEST_TENANT_ID,
    workspaceId: TEST_WORKSPACE_ID,
    attemptId: attempt.id,
    assessmentId: attempt.assessmentId,
    snapshotId: attempt.snapshotId,
  });
  const grade = AssessmentAnswerGrade.createNotGraded({
    id: 'grade-1',
    attemptId: attempt.id,
    answerId: 'answer-1',
    questionId: 'question-1',
    questionKind: 'LONG_ANSWER',
    maxScore: AssessmentGradeScore.create(5),
  });
  grade.markPendingManualReview();
  run.addAnswerGrade(grade);
  run.markPartial();
  return { attempt, run };
}

describe('ManualGradeAssessmentAnswerUseCase', () => {
  it('manual grade updates pending grade and recalculates totals', async () => {
    const tx: TransactionContext = { transactionId: 'tx-1', client: {} };
    const { attempt, run } = createRunAndAttempt();
    const attemptRepo = {
      findById: vi.fn(async () => attempt),
      save: vi.fn(async (value) => value),
      listByLearner: vi.fn(async () => []),
      listByAssessmentAndLearner: vi.fn(async () => []),
    } as unknown as AssessmentAttemptRepository;
    const gradingRepo = {
      saveRun: vi.fn(async (value) => value),
      findRunById: vi.fn(async () => run),
      findLatestRunByAttemptId: vi.fn(async () => run),
      listRunsByAttemptId: vi.fn(async () => [run]),
      listPendingManualReview: vi.fn(async () => run.answerGrades),
    } as unknown as AssessmentGradingRepository;
    const audit = createAuditRecorder();
    const outbox: OutboxPublisher = { publish: vi.fn(async () => undefined) };
    const useCase = new ManualGradeAssessmentAnswerUseCase(
      attemptRepo,
      gradingRepo,
      createPermissionEvaluator(true),
      createTransactionRunner(tx),
      audit,
      new AssessmentEventPublisherService(outbox),
    );

    const response = await useCase.execute(
      createAssessmentRequestContext(),
      run.id,
      'answer-1',
      { score: 4, feedback: { note: 'good' } },
    );

    expect(response.status).toBe('COMPLETED');
    expect(response.totalScore).toBe(4);
    expect(response.answerGrades[0]?.status).toBe('MANUALLY_GRADED');
    expect(attempt.result?.gradingStatus).toBe('GRADED');
    expect(audit.record).toHaveBeenCalledWith(expect.anything(), expect.anything(), tx);
    expect(outbox.publish).toHaveBeenCalled();
  });
});
