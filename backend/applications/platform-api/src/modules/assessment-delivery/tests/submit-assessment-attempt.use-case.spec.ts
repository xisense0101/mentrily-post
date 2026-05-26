import { describe, expect, it, vi } from 'vitest';
import {
  AuditRecorder,
  OutboxPublisher,
  PermissionEvaluator,
  TransactionContext,
  TransactionRunner,
} from '@mentrily/service-core';
import { AssessmentAttemptRepository } from '../domain/repositories/index.js';
import { AssessmentAttempt, AssessmentAttemptSubmissionPolicyService } from '../domain/index.js';
import { AssessmentEventPublisherService } from '../application/services/index.js';
import { SubmitAssessmentAttemptUseCase } from '../application/use-cases/index.js';
import {
  TEST_ACTOR_ID,
  TEST_TENANT_ID,
  TEST_WORKSPACE_ID,
  createAssessmentRequestContext,
} from './assessment-test-fixtures.js';

function createAttempt() {
  const attempt = AssessmentAttempt.start({
    id: '60000000-0000-4000-8000-000000000001',
    tenantId: TEST_TENANT_ID,
    workspaceId: TEST_WORKSPACE_ID,
    assessmentId: '60000000-0000-4000-8000-000000000002',
    snapshotId: '60000000-0000-4000-8000-000000000003',
    snapshotVersionId: '60000000-0000-4000-8000-000000000004',
    snapshotVersionNumber: 1,
    learnerPrincipalId: TEST_ACTOR_ID,
    sessionId: '60000000-0000-4000-8000-000000000005',
  });
  attempt.saveAnswer({
    answerId: '60000000-0000-4000-8000-000000000006',
    questionId: '60000000-0000-4000-8000-000000000007',
    questionKind: 'SHORT_ANSWER',
    answer: { text: 'draft' },
  });
  return attempt;
}

function createPermissionEvaluator(allowed: boolean): PermissionEvaluator {
  return { evaluate: vi.fn(async () => ({ allowed })) };
}

function createTransactionRunner(tx: TransactionContext): TransactionRunner {
  return {
    run: vi.fn(async (operation) =>
      operation({
        ...tx,
        client: {
          $executeRaw: vi.fn(async () => 1),
          ...(typeof tx.client === 'object' && tx.client !== null ? tx.client : {}),
        },
      }),
    ),
  };
}

function createAuditRecorder(): AuditRecorder {
  return { record: vi.fn(async () => undefined) };
}

function createPrismaService() {
  return {
    $executeRaw: vi.fn(async () => 1),
  };
}

describe('SubmitAssessmentAttemptUseCase', () => {
  it('creates a result placeholder and writes inside the shared transaction', async () => {
    const tx: TransactionContext = { transactionId: 'tx-1', client: {} };
    const attempt = createAttempt();
    const repo = {
      findById: vi.fn(async () => attempt),
      save: vi.fn(async (savedAttempt) => savedAttempt),
      listByLearner: vi.fn(async () => []),
      listByAssessmentAndLearner: vi.fn(async () => []),
      findInProgressByAssessmentAndLearner: vi.fn(async () => attempt),
    } as unknown as AssessmentAttemptRepository;
    const audit = createAuditRecorder();
    const outbox: OutboxPublisher = { publish: vi.fn(async () => undefined) };
    const useCase = new SubmitAssessmentAttemptUseCase(
      createPrismaService() as never,
      repo,
      new AssessmentAttemptSubmissionPolicyService(),
      createPermissionEvaluator(true),
      createTransactionRunner(tx),
      audit,
      new AssessmentEventPublisherService(outbox),
    );

    const response = await useCase.execute(createAssessmentRequestContext(), attempt.id);

    expect(response.status).toBe('SUBMITTED');
    expect(response.answers.every((answer) => answer.status === 'SUBMITTED')).toBe(true);
    expect(response.result).toMatchObject({ gradingStatus: 'NOT_GRADED' });
    expect(vi.mocked(repo.save).mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({ transactionId: tx.transactionId }),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ transactionId: tx.transactionId }),
    );
    expect(outbox.publish).toHaveBeenCalledTimes(2);
    expect(outbox.publish).toHaveBeenCalledWith(
      expect.objectContaining({ eventName: 'assessment.attempt.submitted' }),
      expect.anything(),
      expect.objectContaining({ transactionId: tx.transactionId }),
    );
    expect(outbox.publish).toHaveBeenCalledWith(
      expect.objectContaining({ eventName: 'assessment.attempt.result.placeholder_created' }),
      expect.anything(),
      expect.objectContaining({ transactionId: tx.transactionId }),
    );
  });

  it('returns the existing submitted attempt without duplicate side effects', async () => {
    const attempt = createAttempt();
    attempt.submit('60000000-0000-4000-8000-000000000099');
    const repo = {
      findById: vi.fn(async () => attempt),
      save: vi.fn(async (savedAttempt) => savedAttempt),
      listByLearner: vi.fn(async () => []),
      listByAssessmentAndLearner: vi.fn(async () => []),
      findInProgressByAssessmentAndLearner: vi.fn(async () => null),
    } as unknown as AssessmentAttemptRepository;
    const audit = createAuditRecorder();
    const outbox: OutboxPublisher = { publish: vi.fn(async () => undefined) };
    const useCase = new SubmitAssessmentAttemptUseCase(
      createPrismaService() as never,
      repo,
      new AssessmentAttemptSubmissionPolicyService(),
      createPermissionEvaluator(true),
      createTransactionRunner({ transactionId: 'tx-1', client: {} }),
      audit,
      new AssessmentEventPublisherService(outbox),
    );

    const response = await useCase.execute(createAssessmentRequestContext(), attempt.id);

    expect(response.status).toBe('SUBMITTED');
    expect(vi.mocked(repo.save)).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
    expect(outbox.publish).not.toHaveBeenCalled();
  });

  it('expires the attempt when submitting at the timer boundary', async () => {
    const now = new Date('2026-05-19T00:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(now);

    try {
      const attempt = AssessmentAttempt.start({
        id: '60000000-0000-4000-8000-000000000101',
        tenantId: TEST_TENANT_ID,
        workspaceId: TEST_WORKSPACE_ID,
        assessmentId: '60000000-0000-4000-8000-000000000102',
        snapshotId: '60000000-0000-4000-8000-000000000103',
        snapshotVersionId: '60000000-0000-4000-8000-000000000104',
        snapshotVersionNumber: 1,
        learnerPrincipalId: TEST_ACTOR_ID,
        sessionId: '60000000-0000-4000-8000-000000000105',
        expiresAt: now,
      });
      const repo = {
        findById: vi.fn(async () => attempt),
        save: vi.fn(async (savedAttempt) => savedAttempt),
        listByLearner: vi.fn(async () => []),
        listByAssessmentAndLearner: vi.fn(async () => []),
        findInProgressByAssessmentAndLearner: vi.fn(async () => attempt),
      } as unknown as AssessmentAttemptRepository;
      const useCase = new SubmitAssessmentAttemptUseCase(
        createPrismaService() as never,
        repo,
        new AssessmentAttemptSubmissionPolicyService(),
        createPermissionEvaluator(true),
        createTransactionRunner({ transactionId: 'tx-1', client: {} }),
        createAuditRecorder(),
        new AssessmentEventPublisherService({ publish: vi.fn(async () => undefined) }),
      );

      await expect(
        useCase.execute(createAssessmentRequestContext(), attempt.id),
      ).rejects.toMatchObject({
        code: 'CONFLICT',
        details: { reason: 'ATTEMPT_EXPIRED' },
      });
      expect(attempt.status).toBe('EXPIRED');
      expect(vi.mocked(repo.save)).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
