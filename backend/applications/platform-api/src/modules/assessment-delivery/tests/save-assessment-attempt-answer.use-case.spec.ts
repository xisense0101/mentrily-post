import { describe, expect, it, vi } from 'vitest';
import {
  AuditRecorder,
  OutboxPublisher,
  PermissionEvaluator,
  TransactionContext,
  TransactionRunner,
} from '@mentrily/service-core';
import {
  AssessmentAttemptRepository,
  AssessmentSnapshotRepository,
} from '../domain/repositories/index.js';
import {
  AssessmentAttemptSubmissionPolicyService,
  AssessmentAttempt,
  AssessmentPublishedSnapshot,
  AssessmentQuestion,
  AssessmentSection,
  QuestionOption,
  QuestionAnswerKey,
  GradingModeEnum,
  QuestionKindEnum,
  QuestionPoints,
} from '../domain/index.js';
import { MediaAssetRepository } from '../../media-library/domain/repositories/index.js';
import { AssessmentEventPublisherService } from '../application/services/index.js';
import { SaveAssessmentAttemptAnswerUseCase } from '../application/use-cases/index.js';
import {
  TEST_ACTOR_ID,
  TEST_TENANT_ID,
  TEST_WORKSPACE_ID,
  createAssessmentRequestContext,
} from './assessment-test-fixtures.js';

function createAttempt(ownerId = TEST_ACTOR_ID) {
  return AssessmentAttempt.start({
    id: '50000000-0000-4000-8000-000000000001',
    tenantId: TEST_TENANT_ID,
    workspaceId: TEST_WORKSPACE_ID,
    assessmentId: '50000000-0000-4000-8000-000000000002',
    snapshotId: '50000000-0000-4000-8000-000000000003',
    snapshotVersionId: '50000000-0000-4000-8000-000000000004',
    snapshotVersionNumber: 1,
    learnerPrincipalId: ownerId,
    sessionId: '50000000-0000-4000-8000-000000000005',
  });
}

function createSnapshot(questionId: string) {
  const isQ106 = questionId === '50000000-0000-4000-8000-000000000106';
  const optionId = isQ106
    ? '50000000-0000-4000-8000-000000000107'
    : '50000000-0000-4000-8000-000000000007';

  const opt1 = QuestionOption.create({
    id: optionId,
    label: 'Option A',
    value: 'A',
    isCorrect: true,
  });
  const opt2 = QuestionOption.create({
    id: isQ106 ? '50000000-0000-4000-8000-000000000108' : '50000000-0000-4000-8000-000000000008',
    label: 'Option B',
    value: 'B',
    isCorrect: false,
  });

  const question = AssessmentQuestion.create({
    id: questionId,
    assessmentId: '50000000-0000-4000-8000-000000000002',
    sectionId: '50000000-0000-4000-8000-000000000010',
    kind: QuestionKindEnum.MCQ,
    title: 'Test MCQ',
    prompt: { text: 'Choose one.' },
    options: [opt1, opt2],
    answerKey: QuestionAnswerKey.create({ correctOptionIds: [optionId] }),
    points: QuestionPoints.create(1),
    gradingMode: GradingModeEnum.AUTO,
    position: 0,
    metadata: {},
  });
  const section = AssessmentSection.create({
    id: '50000000-0000-4000-8000-000000000010',
    assessmentId: '50000000-0000-4000-8000-000000000002',
    title: 'Section 1',
    position: 0,
    questions: [question],
    metadata: {},
  });
  return AssessmentPublishedSnapshot.restore({
    id: '50000000-0000-4000-8000-000000000003',
    assessmentId: '50000000-0000-4000-8000-000000000002',
    versionId: '50000000-0000-4000-8000-000000000004',
    versionNumber: 1,
    sections: [section],
    looseQuestions: [],
    publishedByPrincipalId: TEST_ACTOR_ID,
    publishedAt: new Date('2026-05-17T12:00:00.000Z'),
    createdAt: new Date('2026-05-17T12:00:00.000Z'),
  });
}

function createPermissionEvaluator(allowed: boolean): PermissionEvaluator {
  return { evaluate: vi.fn(async () => ({ allowed })) };
}

function createTransactionRunner(tx: TransactionContext): TransactionRunner {
  return { run: vi.fn(async (operation) => operation(tx)) };
}

function createAuditRecorder(): AuditRecorder {
  return { record: vi.fn(async () => undefined) };
}

describe('SaveAssessmentAttemptAnswerUseCase', () => {
  it('enforces learner ownership', async () => {
    const attempt = createAttempt('50000000-0000-4000-8000-000000000099');
    const repo = {
      findById: vi.fn(async () => attempt),
      save: vi.fn(async (savedAttempt) => savedAttempt),
      listByLearner: vi.fn(async () => []),
      listByAssessmentAndLearner: vi.fn(async () => []),
      findInProgressByAssessmentAndLearner: vi.fn(async () => attempt),
    } as unknown as AssessmentAttemptRepository;
    const snapshotRepo = {
      findById: vi.fn(async () => null),
    } as unknown as AssessmentSnapshotRepository;
    const mediaAssetRepo = {} as unknown as MediaAssetRepository;
    const useCase = new SaveAssessmentAttemptAnswerUseCase(
      repo,
      snapshotRepo,
      mediaAssetRepo,
      new AssessmentAttemptSubmissionPolicyService(),
      createPermissionEvaluator(true),
      createTransactionRunner({ transactionId: 'tx-1', client: {} }),
      createAuditRecorder(),
      new AssessmentEventPublisherService({ publish: vi.fn(async () => undefined) }),
    );

    await expect(
      useCase.execute(createAssessmentRequestContext(), attempt.id, {
        questionId: '50000000-0000-4000-8000-000000000006',
        questionKind: 'MCQ',
        answer: { selectedOptionId: '50000000-0000-4000-8000-000000000007' },
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('saves an answer inside the transaction and emits audit/outbox', async () => {
    const tx: TransactionContext = { transactionId: 'tx-1', client: {} };
    const attempt = createAttempt();
    const repo = {
      findById: vi.fn(async () => attempt),
      save: vi.fn(async (savedAttempt) => savedAttempt),
      listByLearner: vi.fn(async () => []),
      listByAssessmentAndLearner: vi.fn(async () => []),
      findInProgressByAssessmentAndLearner: vi.fn(async () => attempt),
    } as unknown as AssessmentAttemptRepository;
    const snapshotRepo = {
      findById: vi.fn(async () => createSnapshot('50000000-0000-4000-8000-000000000006')),
    } as unknown as AssessmentSnapshotRepository;
    const mediaAssetRepo = {} as unknown as MediaAssetRepository;
    const audit = createAuditRecorder();
    const outbox: OutboxPublisher = { publish: vi.fn(async () => undefined) };
    const useCase = new SaveAssessmentAttemptAnswerUseCase(
      repo,
      snapshotRepo,
      mediaAssetRepo,
      new AssessmentAttemptSubmissionPolicyService(),
      createPermissionEvaluator(true),
      createTransactionRunner(tx),
      audit,
      new AssessmentEventPublisherService(outbox),
    );

    const response = await useCase.execute(createAssessmentRequestContext(), attempt.id, {
      questionId: '50000000-0000-4000-8000-000000000006',
      questionKind: 'MCQ',
      answer: { selectedOptionId: '50000000-0000-4000-8000-000000000007' },
      metadata: { autosave: true },
    });

    expect(response.answers).toHaveLength(1);
    expect(response.answers[0]).toMatchObject({
      questionId: '50000000-0000-4000-8000-000000000006',
      status: 'DRAFT',
    });
    expect(vi.mocked(repo.save).mock.calls[0]?.[1]).toBe(tx);
    expect(audit.record).toHaveBeenCalledWith(expect.anything(), expect.anything(), tx);
    expect(outbox.publish).toHaveBeenCalledWith(
      expect.objectContaining({ eventName: 'assessment.attempt.answer_saved' }),
      expect.anything(),
      tx,
    );
  });

  it('expires the attempt when saving at the timer boundary', async () => {
    const now = new Date('2026-05-19T00:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(now);

    try {
      const attempt = AssessmentAttempt.start({
        id: '50000000-0000-4000-8000-000000000101',
        tenantId: TEST_TENANT_ID,
        workspaceId: TEST_WORKSPACE_ID,
        assessmentId: '50000000-0000-4000-8000-000000000102',
        snapshotId: '50000000-0000-4000-8000-000000000103',
        snapshotVersionId: '50000000-0000-4000-8000-000000000104',
        snapshotVersionNumber: 1,
        learnerPrincipalId: TEST_ACTOR_ID,
        sessionId: '50000000-0000-4000-8000-000000000105',
        expiresAt: now,
      });
      const repo = {
        findById: vi.fn(async () => attempt),
        save: vi.fn(async (savedAttempt) => savedAttempt),
        listByLearner: vi.fn(async () => []),
        listByAssessmentAndLearner: vi.fn(async () => []),
        findInProgressByAssessmentAndLearner: vi.fn(async () => attempt),
      } as unknown as AssessmentAttemptRepository;
      const snapshotRepo = {
        findById: vi.fn(async () => createSnapshot('50000000-0000-4000-8000-000000000106')),
      } as unknown as AssessmentSnapshotRepository;
      const mediaAssetRepo = {} as unknown as MediaAssetRepository;
      const useCase = new SaveAssessmentAttemptAnswerUseCase(
        repo,
        snapshotRepo,
        mediaAssetRepo,
        new AssessmentAttemptSubmissionPolicyService(),
        createPermissionEvaluator(true),
        createTransactionRunner({ transactionId: 'tx-1', client: {} }),
        createAuditRecorder(),
        new AssessmentEventPublisherService({ publish: vi.fn(async () => undefined) }),
      );

      await expect(
        useCase.execute(createAssessmentRequestContext(), attempt.id, {
          questionId: '50000000-0000-4000-8000-000000000106',
          questionKind: 'MCQ',
          answer: { selectedOptionId: '50000000-0000-4000-8000-000000000107' },
        }),
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
