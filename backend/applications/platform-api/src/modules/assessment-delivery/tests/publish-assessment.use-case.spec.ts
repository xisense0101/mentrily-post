import { describe, expect, it, vi } from 'vitest';
import {
  AuditRecorder,
  OutboxPublisher,
  PermissionEvaluator,
  TransactionContext,
  TransactionRunner,
} from '@mentrily/service-core';
import {
  AssessmentRepository,
  AssessmentSnapshotRepository,
} from '../domain/repositories/index.js';
import { AssessmentEventPublisherService } from '../application/services/index.js';
import { PublishAssessmentUseCase } from '../application/use-cases/index.js';
import {
  Assessment,
  AssessmentVersion,
  AssessmentQuestion,
  QuestionOption,
  QuestionPoints,
  QuestionKindEnum,
  GradingModeEnum,
  AssessmentPurposeEnum,
  AssessmentVisibilityEnum,
  AttemptPolicy,
  TimeLimit,
  ResultReleasePolicyEnum,
} from '../domain/index.js';
import {
  createAssessmentRequestContext,
  TEST_ACTOR_ID,
  TEST_TENANT_ID,
  TEST_WORKSPACE_ID,
} from './assessment-test-fixtures.js';

function createRepo(assessment?: Assessment): AssessmentRepository {
  return {
    save: vi.fn(async (a: Assessment) => a),
    findById: vi.fn(async () => assessment ?? null),
    listByWorkspace: vi.fn(async () => []),
    listByPurpose: vi.fn(async () => []),
  } as unknown as AssessmentRepository;
}

function createSnapshotRepo(): AssessmentSnapshotRepository {
  return {
    save: vi.fn(async (s) => s),
    findLatestByAssessmentId: vi.fn(async () => null),
    listByAssessmentId: vi.fn(async () => []),
  } as unknown as AssessmentSnapshotRepository;
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

describe('PublishAssessmentUseCase', () => {
  it('successful publish saves snapshot and assessment in same transaction', async () => {
    const assessment = Assessment.createDraft({
      id: 'assessment-1',
      tenantId: TEST_TENANT_ID,
      workspaceId: TEST_WORKSPACE_ID,
      ownerPrincipalId: TEST_ACTOR_ID,
      purpose: AssessmentPurposeEnum.QUIZ,
      title: 'Quiz 1',
      visibility: AssessmentVisibilityEnum.WORKSPACE,
      attemptPolicy: AttemptPolicy.create({ allowRetake: false, shuffleQuestions: false, shuffleOptions: false }),
      timeLimit: TimeLimit.untimed(),
      resultReleasePolicy: ResultReleasePolicyEnum.IMMEDIATE,
      metadata: {},
    });

    assessment.replaceDraftContent(
      AssessmentVersion.createDraft({
        id: 'v1',
        assessmentId: assessment.id,
        versionNumber: 1,
        sections: [],
        looseQuestions: [
          AssessmentQuestion.create({
            id: 'q1',
            assessmentId: assessment.id,
            kind: QuestionKindEnum.MCQ,
            title: 'Q1',
            prompt: { text: '?' },
            options: [
              QuestionOption.create({ id: 'o1', label: 'A', value: 'a', isCorrect: true }),
              QuestionOption.create({ id: 'o2', label: 'B', value: 'b', isCorrect: false }),
            ],
            points: QuestionPoints.create(1),
            gradingMode: GradingModeEnum.AUTO,
            position: 0,
            metadata: {},
          }),
        ],
        createdByPrincipalId: TEST_ACTOR_ID,
        createdAt: new Date(),
      }),
    );

    const tx: TransactionContext = { transactionId: 'tx-1', client: {} };
    const repo = createRepo(assessment);
    const snapshotRepo = createSnapshotRepo();
    const permissions = createPermissionEvaluator(true);
    const transactions = createTransactionRunner(tx);
    const audit = createAuditRecorder();
    const outbox: OutboxPublisher = { publish: vi.fn(async () => undefined) };
    const eventPublisher = new AssessmentEventPublisherService(outbox);

    const useCase = new PublishAssessmentUseCase(
      repo,
      snapshotRepo,
      permissions,
      transactions,
      audit,
      eventPublisher,
    );

    const response = await useCase.execute(createAssessmentRequestContext(), assessment.id);

    expect(response.status).toBe('PUBLISHED');
    expect(repo.save).toHaveBeenCalledWith(expect.anything(), tx);
    expect(snapshotRepo.save).toHaveBeenCalledWith(expect.anything(), tx);
    expect(outbox.publish).toHaveBeenCalledWith(
      expect.objectContaining({ eventName: 'assessment.published' }),
      expect.anything(),
      tx,
    );
    expect(outbox.publish).toHaveBeenCalledWith(
      expect.objectContaining({ eventName: 'assessment.snapshot.created' }),
      expect.anything(),
      tx,
    );
  });
});
