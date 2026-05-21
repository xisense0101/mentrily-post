import { describe, expect, it, vi } from 'vitest';
import { AuditRecorder, OutboxPublisher, PermissionEvaluator, TransactionContext, TransactionRunner } from '@mentrily/service-core';
import { AssessmentAttemptRepository, AssessmentGradingRepository } from '../domain/repositories/index.js';
import { AssessmentAttempt, AssessmentAnswerGrade, AssessmentGradeScore, AssessmentGradingRun, AssessmentResultReleasePolicyService } from '../domain/index.js';
import { AssessmentEventPublisherService } from '../application/services/index.js';
import { ReleaseAssessmentResultUseCase } from '../application/use-cases/index.js';
import { TEST_ACTOR_ID, TEST_TENANT_ID, TEST_WORKSPACE_ID, createAssessmentRequestContext } from './assessment-test-fixtures.js';

function createPermissionEvaluator(allowed: boolean): PermissionEvaluator { return { evaluate: vi.fn(async () => ({ allowed })) }; }
function createTransactionRunner(tx: TransactionContext): TransactionRunner { return { run: vi.fn(async (operation) => operation(tx)) }; }
function createAuditRecorder(): AuditRecorder { return { record: vi.fn(async () => undefined) }; }

function createAttemptAndRun() {
  const attempt = AssessmentAttempt.start({ id: 'attempt-1', tenantId: TEST_TENANT_ID, workspaceId: TEST_WORKSPACE_ID, assessmentId: 'assessment-1', snapshotId: 'snapshot-1', snapshotVersionId: 'version-1', snapshotVersionNumber: 1, learnerPrincipalId: 'learner-1', sessionId: 'session-1' });
  attempt.submit('result-1');
  attempt.result?.markGraded({ value: 4 } as never, { value: 5 } as never);
  const run = AssessmentGradingRun.start({ id: 'run-1', tenantId: TEST_TENANT_ID, workspaceId: TEST_WORKSPACE_ID, attemptId: attempt.id, assessmentId: attempt.assessmentId, snapshotId: attempt.snapshotId });
  const grade = AssessmentAnswerGrade.createNotGraded({ id: 'grade-1', attemptId: attempt.id, answerId: 'answer-1', questionId: 'question-1', questionKind: 'LONG_ANSWER', maxScore: AssessmentGradeScore.create(5) });
  grade.markManuallyGraded(AssessmentGradeScore.create(4, grade.maxScore), TEST_ACTOR_ID, { note: 'Reviewed' });
  run.addAnswerGrade(grade);
  run.markCompleted();
  return { attempt, run };
}

describe('ReleaseAssessmentResultUseCase', () => {
  it('permission denial prevents transaction', async () => {
    const txRunner = createTransactionRunner({ transactionId: 'tx-1', client: {} });
    const useCase = new ReleaseAssessmentResultUseCase({} as AssessmentAttemptRepository, {} as AssessmentGradingRepository, new AssessmentResultReleasePolicyService(), createPermissionEvaluator(false), txRunner, createAuditRecorder(), new AssessmentEventPublisherService({ publish: vi.fn(async () => undefined) }));
    await expect(useCase.execute(createAssessmentRequestContext(), 'attempt-1')).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(txRunner.run).not.toHaveBeenCalled();
  });

  it('release updates result status and timestamp and emits audit/outbox in transaction', async () => {
    const tx: TransactionContext = { transactionId: 'tx-1', client: {} };
    const { attempt, run } = createAttemptAndRun();
    const attemptRepo = { findById: vi.fn(async () => attempt), save: vi.fn(async (value) => value), listByLearner: vi.fn(async () => []), listByAssessmentAndLearner: vi.fn(async () => []) } as unknown as AssessmentAttemptRepository;
    const gradingRepo = { findLatestRunByAttemptId: vi.fn(async () => run), saveRun: vi.fn(async (value) => value), findRunById: vi.fn(async () => run), listRunsByAttemptId: vi.fn(async () => [run]), listPendingManualReview: vi.fn(async () => []) } as unknown as AssessmentGradingRepository;
    const audit = createAuditRecorder();
    const outbox: OutboxPublisher = { publish: vi.fn(async () => undefined) };
    const useCase = new ReleaseAssessmentResultUseCase(attemptRepo, gradingRepo, new AssessmentResultReleasePolicyService(), createPermissionEvaluator(true), createTransactionRunner(tx), audit, new AssessmentEventPublisherService(outbox));
    const response = await useCase.execute(createAssessmentRequestContext(), attempt.id);
    expect(response.gradingStatus).toBe('RELEASED');
    expect(response.releasedAt).toBeTruthy();
    expect(attempt.result?.gradingStatus).toBe('RELEASED');
    expect(vi.mocked(attemptRepo.save).mock.calls[0]?.[1]).toBe(tx);
    expect(audit.record).toHaveBeenCalledWith(expect.anything(), expect.anything(), tx);
    expect(outbox.publish).toHaveBeenCalled();
  });
});
