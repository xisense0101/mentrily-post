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
  AssessmentGradingRepository,
  AssessmentSnapshotRepository,
} from '../domain/repositories/index.js';
import {
  AssessmentAttempt,
  AssessmentAutoGradingService,
  AssessmentGradingPolicyService,
  AssessmentPublishedSnapshot,
  AssessmentQuestion,
  QuestionKindEnum,
  QuestionAnswerKey,
  QuestionOption,
  QuestionPoints,
  GradingModeEnum,
  AssessmentGradingRun,
} from '../domain/index.js';
import {
  AssessmentEventPublisherService,
  AssessmentExecutionReservationService,
  CodingAnswerGradingService,
} from '../application/services/index.js';
import { GradeAssessmentAttemptUseCase } from '../application/use-cases/index.js';
import {
  TEST_ACTOR_ID,
  TEST_TENANT_ID,
  TEST_WORKSPACE_ID,
  createAssessmentRequestContext,
  createAssessmentRequestContextWithoutWorkspace,
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

function createAttemptAndSnapshot() {
  const question = AssessmentQuestion.create({
    id: 'question-1',
    assessmentId: 'assessment-1',
    kind: QuestionKindEnum.MCQ,
    title: 'Question',
    prompt: { text: 'Question' },
    options: [
      QuestionOption.create({ id: 'option-a', label: 'A', value: 'a', isCorrect: true }),
      QuestionOption.create({ id: 'option-b', label: 'B', value: 'b', isCorrect: false }),
    ],
    answerKey: QuestionAnswerKey.create({ correctOptionIds: ['option-a'] }),
    points: QuestionPoints.create(1),
    gradingMode: GradingModeEnum.AUTO,
    position: 0,
    metadata: {},
  });
  const snapshot = AssessmentPublishedSnapshot.restore({
    id: 'snapshot-1',
    assessmentId: 'assessment-1',
    versionId: 'version-1',
    versionNumber: 1,
    sections: [],
    looseQuestions: [question],
    publishedByPrincipalId: TEST_ACTOR_ID,
    publishedAt: new Date(),
    createdAt: new Date(),
  });
  const attempt = AssessmentAttempt.start({
    id: 'attempt-1',
    tenantId: TEST_TENANT_ID,
    workspaceId: TEST_WORKSPACE_ID,
    assessmentId: 'assessment-1',
    snapshotId: snapshot.id,
    snapshotVersionId: snapshot.versionId,
    snapshotVersionNumber: 1,
    learnerPrincipalId: TEST_ACTOR_ID,
    sessionId: 'session-1',
  });
  attempt.saveAnswer({
    answerId: 'answer-1',
    questionId: question.id,
    questionKind: question.kind,
    answer: { selectedOptionId: 'option-a' },
  });
  attempt.submit('result-1');
  return { attempt, snapshot };
}

describe('GradeAssessmentAttemptUseCase', () => {
  const mockCodingAnswerGrading = {
    gradeAnswer: vi.fn(async () => ({
      status: 'AUTO_GRADED',
      score: 5,
      feedback: { success: true },
      metadata: { runId: 'run-1' },
    })),
  } as unknown as CodingAnswerGradingService;

  it('requires actor context', async () => {
    const attemptRepo = {
      acquireRowLock: vi.fn(async () => {}),
    } as unknown as AssessmentAttemptRepository;
    const snapshotRepo = {} as AssessmentSnapshotRepository;
    const gradingRepo = {
      findLatestRunByAttemptId: vi.fn(async () => null),
      listRunsByAttemptId: vi.fn(async () => []),
      saveRun: vi.fn(async (run) => run),
      findRunById: vi.fn(async () => null),
    } as unknown as AssessmentGradingRepository;
    const useCase = new GradeAssessmentAttemptUseCase(
      attemptRepo,
      snapshotRepo,
      gradingRepo,
      new AssessmentAutoGradingService(),
      new AssessmentGradingPolicyService(),
      new AssessmentExecutionReservationService(),
      mockCodingAnswerGrading,
      createPermissionEvaluator(true),
      createTransactionRunner({ transactionId: 'tx-1', client: {} }),
      createAuditRecorder(),
      new AssessmentEventPublisherService({ publish: vi.fn(async () => undefined) }),
    );

    await expect(
      useCase.execute(createAssessmentRequestContextWithoutWorkspace(), 'attempt-1'),
    ).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
  });

  it('denies when permission fails before transaction', async () => {
    const txRunner = createTransactionRunner({ transactionId: 'tx-1', client: {} });
    const useCase = new GradeAssessmentAttemptUseCase(
      { acquireRowLock: vi.fn(async () => {}) } as unknown as AssessmentAttemptRepository,
      {} as AssessmentSnapshotRepository,
      {
        findLatestRunByAttemptId: vi.fn(async () => null),
        listRunsByAttemptId: vi.fn(async () => []),
        saveRun: vi.fn(async (run) => run),
        findRunById: vi.fn(async () => null),
      } as unknown as AssessmentGradingRepository,
      new AssessmentAutoGradingService(),
      new AssessmentGradingPolicyService(),
      new AssessmentExecutionReservationService(),
      mockCodingAnswerGrading,
      createPermissionEvaluator(false),
      txRunner,
      createAuditRecorder(),
      new AssessmentEventPublisherService({ publish: vi.fn(async () => undefined) }),
    );

    await expect(
      useCase.execute(createAssessmentRequestContext(), 'attempt-1'),
    ).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    expect(txRunner.run).not.toHaveBeenCalled();
  });

  it('cannot grade an in-progress attempt', async () => {
    const { attempt, snapshot } = createAttemptAndSnapshot();
    attempt.status = 'IN_PROGRESS';
    const useCase = new GradeAssessmentAttemptUseCase(
      {
        findById: vi.fn(async () => attempt),
        save: vi.fn(async (value) => value),
        listByLearner: vi.fn(async () => []),
        listByAssessmentAndLearner: vi.fn(async () => []),
        acquireRowLock: vi.fn(async () => {}),
      } as unknown as AssessmentAttemptRepository,
      { findById: vi.fn(async () => snapshot) } as unknown as AssessmentSnapshotRepository,
      {
        findLatestRunByAttemptId: vi.fn(async () => null),
        listRunsByAttemptId: vi.fn(async () => []),
        saveRun: vi.fn(async (run) => run),
        findRunById: vi.fn(async () => null),
      } as unknown as AssessmentGradingRepository,
      new AssessmentAutoGradingService(),
      new AssessmentGradingPolicyService(),
      new AssessmentExecutionReservationService(),
      mockCodingAnswerGrading,
      createPermissionEvaluator(true),
      createTransactionRunner({ transactionId: 'tx-1', client: {} }),
      createAuditRecorder(),
      new AssessmentEventPublisherService({ publish: vi.fn(async () => undefined) }),
    );

    await expect(
      useCase.execute(createAssessmentRequestContext(), attempt.id),
    ).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
  });

  it('grades submitted attempt and writes audit/outbox in transaction', async () => {
    const tx: TransactionContext = { transactionId: 'tx-1', client: {} };
    const { attempt, snapshot } = createAttemptAndSnapshot();
    const attemptRepo = {
      findById: vi.fn(async () => attempt),
      save: vi.fn(async (value) => value),
      listByLearner: vi.fn(async () => []),
      listByAssessmentAndLearner: vi.fn(async () => []),
      acquireRowLock: vi.fn(async () => {}),
    } as unknown as AssessmentAttemptRepository;
    let savedRun: AssessmentGradingRun | null = null;
    const gradingRepo = {
      saveRun: vi.fn(async (run) => {
        savedRun = run;
        return run;
      }),
      findRunById: vi.fn(async () => savedRun),
      findLatestRunByAttemptId: vi.fn(async () => null),
      listRunsByAttemptId: vi.fn(async () => []),
      listPendingManualReview: vi.fn(async () => []),
    } as unknown as AssessmentGradingRepository;
    const audit = createAuditRecorder();
    const outbox: OutboxPublisher = { publish: vi.fn(async () => undefined) };
    const useCase = new GradeAssessmentAttemptUseCase(
      attemptRepo,
      { findById: vi.fn(async () => snapshot) } as unknown as AssessmentSnapshotRepository,
      gradingRepo,
      new AssessmentAutoGradingService(),
      new AssessmentGradingPolicyService(),
      new AssessmentExecutionReservationService(),
      mockCodingAnswerGrading,
      createPermissionEvaluator(true),
      createTransactionRunner(tx),
      audit,
      new AssessmentEventPublisherService(outbox),
    );

    const response = await useCase.execute(createAssessmentRequestContext(), attempt.id);
    expect(response.status).toBe('COMPLETED');
    expect(response.totalScore).toBe(1);
    expect(response.maxScore).toBe(1);
    expect(response.answerGrades[0]?.status).toBe('AUTO_GRADED');
    expect(vi.mocked(attemptRepo.save).mock.calls.at(-1)?.[1]).toBe(tx);
    expect(vi.mocked(gradingRepo.saveRun).mock.calls[0]?.[1]).toBe(tx);
    expect(audit.record).toHaveBeenCalledWith(expect.anything(), expect.anything(), tx);
    expect(outbox.publish).toHaveBeenCalled();
  });

  it('cross-workspace attempt cannot be graded', async () => {
    const { attempt, snapshot } = createAttemptAndSnapshot();
    const crossWorkspaceAttempt = AssessmentAttempt.restore({
      ...attempt,
      workspaceId: 'workspace-2',
    });
    const useCase = new GradeAssessmentAttemptUseCase(
      {
        findById: vi.fn(async () => crossWorkspaceAttempt),
        save: vi.fn(async (value) => value),
        listByLearner: vi.fn(async () => []),
        listByAssessmentAndLearner: vi.fn(async () => []),
        acquireRowLock: vi.fn(async () => {}),
      } as unknown as AssessmentAttemptRepository,
      { findById: vi.fn(async () => snapshot) } as unknown as AssessmentSnapshotRepository,
      {
        findLatestRunByAttemptId: vi.fn(async () => null),
        listRunsByAttemptId: vi.fn(async () => []),
        saveRun: vi.fn(async (run) => run),
        findRunById: vi.fn(async () => null),
      } as unknown as AssessmentGradingRepository,
      new AssessmentAutoGradingService(),
      new AssessmentGradingPolicyService(),
      new AssessmentExecutionReservationService(),
      mockCodingAnswerGrading,
      createPermissionEvaluator(true),
      createTransactionRunner({ transactionId: 'tx-1', client: {} }),
      createAuditRecorder(),
      new AssessmentEventPublisherService({ publish: vi.fn(async () => undefined) }),
    );

    await expect(
      useCase.execute(createAssessmentRequestContext(), crossWorkspaceAttempt.id),
    ).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('delegates grading to CodingAnswerGradingService for CODE questions', async () => {
    const tx: TransactionContext = { transactionId: 'tx-1', client: {} };
    const codeQuestion = AssessmentQuestion.create({
      id: 'question-code-1',
      assessmentId: 'assessment-1',
      kind: QuestionKindEnum.CODE,
      title: 'Coding Question',
      prompt: { text: 'Write code' },
      options: [],
      points: QuestionPoints.create(10),
      gradingMode: GradingModeEnum.AUTO,
      position: 0,
      metadata: {
        gradingTestCases: [
          { id: 'tc-1', input: '1', expectedOutput: '2', visibility: 'HIDDEN_GRADED' },
        ],
      },
    });

    const snapshot = AssessmentPublishedSnapshot.restore({
      id: 'snapshot-1',
      assessmentId: 'assessment-1',
      versionId: 'version-1',
      versionNumber: 1,
      sections: [],
      looseQuestions: [codeQuestion],
      publishedByPrincipalId: TEST_ACTOR_ID,
      publishedAt: new Date(),
      createdAt: new Date(),
    });

    const attempt = AssessmentAttempt.start({
      id: 'attempt-code-1',
      tenantId: TEST_TENANT_ID,
      workspaceId: TEST_WORKSPACE_ID,
      assessmentId: 'assessment-1',
      snapshotId: snapshot.id,
      snapshotVersionId: snapshot.versionId,
      snapshotVersionNumber: 1,
      learnerPrincipalId: TEST_ACTOR_ID,
      sessionId: 'session-1',
    });
    attempt.saveAnswer({
      answerId: 'answer-code-1',
      questionId: codeQuestion.id,
      questionKind: codeQuestion.kind,
      answer: { sourceCode: 'print(1)', language: 'python3' },
    });
    attempt.submit('result-1');

    const attemptRepo = {
      findById: vi.fn(async () => attempt),
      save: vi.fn(async (value) => value),
      listByLearner: vi.fn(async () => []),
      listByAssessmentAndLearner: vi.fn(async () => []),
      acquireRowLock: vi.fn(async () => {}),
    } as unknown as AssessmentAttemptRepository;

    let savedRunCode: AssessmentGradingRun | null = null;
    const gradingRepo = {
      saveRun: vi.fn(async (run) => {
        savedRunCode = run;
        return run;
      }),
      findRunById: vi.fn(async () => savedRunCode),
      findLatestRunByAttemptId: vi.fn(async () => null),
      listRunsByAttemptId: vi.fn(async () => []),
    } as unknown as AssessmentGradingRepository;

    const useCase = new GradeAssessmentAttemptUseCase(
      attemptRepo,
      { findById: vi.fn(async () => snapshot) } as unknown as AssessmentSnapshotRepository,
      gradingRepo,
      new AssessmentAutoGradingService(),
      new AssessmentGradingPolicyService(),
      new AssessmentExecutionReservationService(),
      mockCodingAnswerGrading,
      createPermissionEvaluator(true),
      createTransactionRunner(tx),
      createAuditRecorder(),
      new AssessmentEventPublisherService({ publish: vi.fn(async () => undefined) }),
    );

    const response = await useCase.execute(createAssessmentRequestContext(), attempt.id);
    expect(mockCodingAnswerGrading.gradeAnswer).toHaveBeenCalled();
    expect(response.totalScore).toBe(5);
    expect(response.maxScore).toBe(10);
    expect(response.answerGrades[0]?.status).toBe('AUTO_GRADED');
  });
});
