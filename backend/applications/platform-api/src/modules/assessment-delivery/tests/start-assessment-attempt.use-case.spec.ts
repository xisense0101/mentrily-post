import { describe, expect, it, vi } from 'vitest';
import {
  AuditRecorder,
  OutboxPublisher,
  PermissionEvaluator,
  TransactionContext,
  TransactionRunner,
} from '@mentrily/service-core';
import {
  Assessment,
  AssessmentPublishedSnapshot,
  AssessmentQuestion,
  AssessmentQuestionKind,
  AssessmentPurposeEnum,
  AssessmentRepository,
  AssessmentSnapshotRepository,
  AssessmentAttemptRepository,
  AssessmentAttemptPolicyService,
  AssessmentStatusEnum,
  AssessmentVisibilityEnum,
  AttemptPolicy,
  GradingModeEnum,
  QuestionOption,
  QuestionPoints,
  ResultReleasePolicyEnum,
  TimeLimit,
} from '../domain/index.js';
import { AssessmentEventPublisherService } from '../application/services/index.js';
import { StartAssessmentAttemptUseCase } from '../application/use-cases/index.js';
import { AssessmentAttempt as AssessmentAttemptEntity } from '../domain/entities/index.js';
import {
  TEST_ACTOR_ID,
  TEST_TENANT_ID,
  TEST_WORKSPACE_ID,
  createAssessmentRequestContext,
} from './assessment-test-fixtures.js';

function createPublishedAssessment() {
  const question = AssessmentQuestion.create({
    id: '40000000-0000-4000-8000-000000000001',
    assessmentId: '40000000-0000-4000-8000-000000000002',
    kind: 'MCQ' as AssessmentQuestionKind,
    title: 'Question 1',
    prompt: { text: 'Question 1' },
    options: [
      QuestionOption.create({
        id: '40000000-0000-4000-8000-000000000003',
        label: 'A',
        value: 'a',
        isCorrect: true,
      }),
      QuestionOption.create({
        id: '40000000-0000-4000-8000-000000000030',
        label: 'B',
        value: 'b',
        isCorrect: false,
      }),
    ],
    points: QuestionPoints.create(1),
    gradingMode: GradingModeEnum.AUTO,
    position: 0,
    metadata: {},
  });

  const assessment = Assessment.restore({
    id: '40000000-0000-4000-8000-000000000002',
    tenantId: TEST_TENANT_ID,
    workspaceId: TEST_WORKSPACE_ID,
    ownerPrincipalId: TEST_ACTOR_ID,
    purpose: AssessmentPurposeEnum.QUIZ,
    status: AssessmentStatusEnum.PUBLISHED,
    visibility: AssessmentVisibilityEnum.WORKSPACE,
    title: 'Published Quiz',
    attemptPolicy: AttemptPolicy.create({
      allowRetake: false,
      shuffleQuestions: false,
      shuffleOptions: false,
      maxAttempts: 1,
    }),
    timeLimit: TimeLimit.create(30),
    resultReleasePolicy: ResultReleasePolicyEnum.IMMEDIATE,
    metadata: {},
    currentDraftVersion: undefined,
    publishedSnapshotId: '40000000-0000-4000-8000-000000000004',
    publishedSnapshot: undefined,
    gradingRubrics: [],
    gradingRules: [],
    createdAt: new Date('2026-05-17T10:00:00.000Z'),
    updatedAt: new Date('2026-05-17T10:05:00.000Z'),
    publishedAt: new Date('2026-05-17T10:05:00.000Z'),
  });

  const snapshot = AssessmentPublishedSnapshot.restore({
    id: '40000000-0000-4000-8000-000000000004',
    assessmentId: assessment.id,
    versionId: '40000000-0000-4000-8000-000000000005',
    versionNumber: 2,
    sections: [],
    looseQuestions: [question],
    publishedByPrincipalId: TEST_ACTOR_ID,
    publishedAt: new Date('2026-05-17T10:05:00.000Z'),
    createdAt: new Date('2026-05-17T10:05:00.000Z'),
  });

  return { assessment, snapshot };
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
      })),
  };
}

function createPrismaService() {
  return {
    $executeRaw: vi.fn(async () => 1),
  };
}

function createAuditRecorder(): AuditRecorder {
  return { record: vi.fn(async () => undefined) };
}

function createAttemptRepo(existingAttempts = []) {
  return {
    save: vi.fn(async (attempt) => attempt),
    findById: vi.fn(async () => null),
    listByLearner: vi.fn(async () => []),
    listByAssessmentAndLearner: vi.fn(async () => existingAttempts),
    findInProgressByAssessmentAndLearner: vi.fn(async () => existingAttempts.find((attempt) => attempt.isInProgress()) ?? null),
  } as unknown as AssessmentAttemptRepository;
}

describe('StartAssessmentAttemptUseCase', () => {
  it('fails without workspace and actor context', async () => {
    const { assessment, snapshot } = createPublishedAssessment();
    const useCase = new StartAssessmentAttemptUseCase(
      createPrismaService() as never,
      { findById: vi.fn(async () => assessment) } as unknown as AssessmentRepository,
      { findLatestByAssessmentId: vi.fn(async () => snapshot) } as unknown as AssessmentSnapshotRepository,
      createAttemptRepo(),
      new AssessmentAttemptPolicyService(),
      createPermissionEvaluator(true),
      createTransactionRunner({ transactionId: 'tx-1', client: {} }),
      createAuditRecorder(),
      new AssessmentEventPublisherService({ publish: vi.fn(async () => undefined) }),
    );

    await expect(
      useCase.execute(
        { requestId: 'req', correlationId: 'cor', timestamp: new Date().toISOString() },
        assessment.id,
      ),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('permission denial prevents transaction', async () => {
    const { assessment, snapshot } = createPublishedAssessment();
    const transactions = createTransactionRunner({ transactionId: 'tx-1', client: {} });
    const useCase = new StartAssessmentAttemptUseCase(
      createPrismaService() as never,
      { findById: vi.fn(async () => assessment) } as unknown as AssessmentRepository,
      { findLatestByAssessmentId: vi.fn(async () => snapshot) } as unknown as AssessmentSnapshotRepository,
      createAttemptRepo(),
      new AssessmentAttemptPolicyService(),
      createPermissionEvaluator(false),
      transactions,
      createAuditRecorder(),
      new AssessmentEventPublisherService({ publish: vi.fn(async () => undefined) }),
    );

    await expect(useCase.execute(createAssessmentRequestContext(), assessment.id)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    expect(transactions.run).not.toHaveBeenCalled();
  });

  it('loads the latest snapshot, uses context tenant/workspace, and writes inside one transaction', async () => {
    const tx: TransactionContext = { transactionId: 'tx-1', client: {} };
    const { assessment, snapshot } = createPublishedAssessment();
    const assessmentRepo = {
      findById: vi.fn(async () => assessment),
    } as unknown as AssessmentRepository;
    const snapshotRepo = {
      findLatestByAssessmentId: vi.fn(async () => snapshot),
    } as unknown as AssessmentSnapshotRepository;
    const attemptRepo = createAttemptRepo();
    const permissions = createPermissionEvaluator(true);
    const transactions = createTransactionRunner(tx);
    const audit = createAuditRecorder();
    const outbox: OutboxPublisher = { publish: vi.fn(async () => undefined) };
    const useCase = new StartAssessmentAttemptUseCase(
      createPrismaService() as never,
      assessmentRepo,
      snapshotRepo,
      attemptRepo,
      new AssessmentAttemptPolicyService(),
      permissions,
      transactions,
      audit,
      new AssessmentEventPublisherService(outbox),
    );

    const response = await useCase.execute(createAssessmentRequestContext(), assessment.id, {
      metadata: { source: 'api' },
    });

    expect(snapshotRepo.findLatestByAssessmentId).toHaveBeenCalledWith(
      assessment.id,
      expect.objectContaining({ transactionId: tx.transactionId }),
    );
    expect(response.snapshotId).toBe(snapshot.id);
    expect(response.snapshotVersionNumber).toBe(snapshot.versionNumber);
    const savedAttempt = vi.mocked(attemptRepo.save).mock.calls[0]?.[0];
    expect(savedAttempt?.tenantId).toBe(TEST_TENANT_ID);
    expect(savedAttempt?.workspaceId).toBe(TEST_WORKSPACE_ID);
    expect(savedAttempt?.metadata).toMatchObject({ source: 'api' });
    expect(vi.mocked(attemptRepo.save).mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({ transactionId: tx.transactionId }),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ transactionId: tx.transactionId }),
    );
    expect(outbox.publish).toHaveBeenCalledWith(
      expect.objectContaining({ eventName: 'assessment.attempt.started' }),
      expect.anything(),
      expect.objectContaining({ transactionId: tx.transactionId }),
    );
  });

  it('rejects start when no published snapshot exists', async () => {
    const { assessment } = createPublishedAssessment();
    const useCase = new StartAssessmentAttemptUseCase(
      createPrismaService() as never,
      { findById: vi.fn(async () => assessment) } as unknown as AssessmentRepository,
      { findLatestByAssessmentId: vi.fn(async () => null) } as unknown as AssessmentSnapshotRepository,
      createAttemptRepo(),
      new AssessmentAttemptPolicyService(),
      createPermissionEvaluator(true),
      createTransactionRunner({ transactionId: 'tx-1', client: {} }),
      createAuditRecorder(),
      new AssessmentEventPublisherService({ publish: vi.fn(async () => undefined) }),
    );

    await expect(useCase.execute(createAssessmentRequestContext(), assessment.id)).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
  });

  it('returns the existing in-progress attempt without recording duplicate side effects', async () => {
    const { assessment, snapshot } = createPublishedAssessment();
    const existingAttempt = AssessmentAttemptEntity.start({
      id: '40000000-0000-4000-8000-000000000010',
      tenantId: TEST_TENANT_ID,
      workspaceId: TEST_WORKSPACE_ID,
      assessmentId: assessment.id,
      snapshotId: snapshot.id,
      snapshotVersionId: snapshot.versionId,
      snapshotVersionNumber: snapshot.versionNumber,
      learnerPrincipalId: TEST_ACTOR_ID,
      sessionId: '40000000-0000-4000-8000-000000000011',
    });
    const attemptRepo = createAttemptRepo([existingAttempt]);
    const audit = createAuditRecorder();
    const outbox: OutboxPublisher = { publish: vi.fn(async () => undefined) };
    const useCase = new StartAssessmentAttemptUseCase(
      createPrismaService() as never,
      { findById: vi.fn(async () => assessment) } as unknown as AssessmentRepository,
      { findLatestByAssessmentId: vi.fn(async () => snapshot) } as unknown as AssessmentSnapshotRepository,
      attemptRepo,
      new AssessmentAttemptPolicyService(),
      createPermissionEvaluator(true),
      createTransactionRunner({ transactionId: 'tx-1', client: {} }),
      audit,
      new AssessmentEventPublisherService(outbox),
    );

    const response = await useCase.execute(createAssessmentRequestContext(), assessment.id);

    expect(response.id).toBe(existingAttempt.id);
    expect(vi.mocked(attemptRepo.save)).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
    expect(outbox.publish).not.toHaveBeenCalled();
  });
});
