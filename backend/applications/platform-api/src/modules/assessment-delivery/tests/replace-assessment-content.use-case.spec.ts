import { describe, expect, it, vi } from 'vitest';
import {
  AuditRecorder,
  OutboxPublisher,
  PermissionEvaluator,
  TransactionContext,
  TransactionRunner,
} from '@mentrily/service-core';
import { AssessmentRepository } from '../domain/repositories/index.js';
import { AssessmentEventPublisherService } from '../application/services/index.js';
import { ReplaceAssessmentContentUseCase } from '../application/use-cases/index.js';
import {
  Assessment,
  AssessmentVersion,
  AssessmentQuestion,
  QuestionOption,
  QuestionPoints,
  GradingModeEnum,
  QuestionKindEnum,
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

function createPermissionEvaluator(allowed: boolean): PermissionEvaluator {
  return {
    evaluate: vi.fn(async () => ({ allowed })),
  };
}

function createTransactionRunner(tx: TransactionContext): TransactionRunner {
  return {
    run: vi.fn(async (operation) => operation(tx)),
  };
}

function createAuditRecorder(): AuditRecorder {
  return {
    record: vi.fn(async () => undefined),
  };
}

function createEventPublisher(outbox: OutboxPublisher = { publish: vi.fn(async () => undefined) }) {
  return {
    outbox,
    service: new AssessmentEventPublisherService(outbox),
  };
}

describe('ReplaceAssessmentContentUseCase', () => {
  const existingAssessment = Assessment.createDraft({
    id: 'assessment-1',
    tenantId: TEST_TENANT_ID,
    workspaceId: TEST_WORKSPACE_ID,
    ownerPrincipalId: TEST_ACTOR_ID,
    purpose: AssessmentPurposeEnum.QUIZ,
    title: 'Old Title',
    visibility: AssessmentVisibilityEnum.WORKSPACE,
    attemptPolicy: AttemptPolicy.create({ allowRetake: false, shuffleQuestions: false, shuffleOptions: false }),
    timeLimit: TimeLimit.untimed(),
    resultReleasePolicy: ResultReleasePolicyEnum.IMMEDIATE,
    metadata: {},
  });
  existingAssessment.replaceDraftContent(
    AssessmentVersion.createDraft({
      id: 'v1',
      assessmentId: 'assessment-1',
      versionNumber: 1,
      sections: [],
      looseQuestions: [
        AssessmentQuestion.create({
          id: 'seed-q',
          assessmentId: 'assessment-1',
          kind: QuestionKindEnum.MCQ,
          title: 'Seed',
          prompt: { text: 'Seed?' },
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

  it('fails if assessment is from different workspace', async () => {
    const repo = createRepo(
      Assessment.createDraft({
        id: 'assessment-1',
        tenantId: TEST_TENANT_ID,
        workspaceId: 'other-workspace',
        ownerPrincipalId: TEST_ACTOR_ID,
        purpose: AssessmentPurposeEnum.QUIZ,
        title: 'Other Title',
        visibility: AssessmentVisibilityEnum.WORKSPACE,
        attemptPolicy: AttemptPolicy.create({ allowRetake: false, shuffleQuestions: false, shuffleOptions: false }),
        timeLimit: TimeLimit.untimed(),
        resultReleasePolicy: ResultReleasePolicyEnum.IMMEDIATE,
        metadata: {},
      }),
    );
    const permissions = createPermissionEvaluator(true);
    const transactions = createTransactionRunner({ transactionId: 'tx-1', client: {} });
    const audit = createAuditRecorder();
    const { service } = createEventPublisher();
    const useCase = new ReplaceAssessmentContentUseCase(
      repo,
      permissions,
      transactions,
      audit,
      service,
    );

    await expect(
      useCase.execute(createAssessmentRequestContext(), 'assessment-1', {
        sections: [],
        looseQuestions: [],
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('successful replace emits audit/outbox in transaction', async () => {
    const tx: TransactionContext = { transactionId: 'tx-1', client: {} };
    const repo = createRepo(existingAssessment);
    const permissions = createPermissionEvaluator(true);
    const transactions = createTransactionRunner(tx);
    const audit = createAuditRecorder();
    const outbox: OutboxPublisher = { publish: vi.fn(async () => undefined) };
    const { service } = createEventPublisher(outbox);
    const useCase = new ReplaceAssessmentContentUseCase(
      repo,
      permissions,
      transactions,
      audit,
      service,
    );

    const response = await useCase.execute(createAssessmentRequestContext(), 'assessment-1', {
      sections: [
        {
          id: 'section-1',
          title: 'S1',
          position: 0,
          questions: [
            {
              id: 'q1',
              kind: 'MCQ',
              title: 'Q1',
              prompt: { text: 'What?' },
              options: [
                { id: 'o1', label: 'A', value: 'a', isCorrect: true },
                { id: 'o2', label: 'B', value: 'b', isCorrect: false },
              ],
              answerKey: { correctOptionIds: ['o1'] },
              points: 1,
              gradingMode: 'AUTO',
              position: 0,
            },
          ],
        },
      ],
      looseQuestions: [],
    });

    expect(response.currentDraftVersion?.sections).toHaveLength(1);
    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'assessment.content_replaced' }),
      expect.anything(),
      tx,
    );
    expect(outbox.publish).toHaveBeenCalledWith(
      expect.objectContaining({ eventName: 'assessment.content_replaced' }),
      expect.anything(),
      tx,
    );
  });
});
