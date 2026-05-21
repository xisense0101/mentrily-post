import { describe, expect, it, vi } from 'vitest';
import type { PermissionEvaluator } from '@mentrily/service-core';
import { AssessmentAttemptRepository } from '../domain/repositories/index.js';
import {
  AssessmentAttempt,
  QuestionKindEnum,
} from '../domain/index.js';
import type { AssessmentExecutionProvider } from '../application/ports/index.js';
import { AssessmentExecutionReservationService } from '../application/services/index.js';
import { RequestAssessmentCodeExecutionUseCase } from '../application/use-cases/index.js';
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

function createAttempt(questionKind: 'CODE' | 'MCQ' = 'CODE'): AssessmentAttempt {
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
  attempt.saveAnswer({
    answerId: 'answer-1',
    questionId: 'question-1',
    questionKind,
    answer: questionKind === 'CODE'
      ? { sourceCode: 'console.log("hi")', language: 'typescript' }
      : { selectedOptionId: 'option-1' },
  });
  attempt.submit('result-1');
  return attempt;
}

function createAttemptRepo(attempt: AssessmentAttempt): AssessmentAttemptRepository {
  return {
    findById: vi.fn(async () => attempt),
    save: vi.fn(async (value) => value),
    listByLearner: vi.fn(async () => []),
    listByAssessmentAndLearner: vi.fn(async () => []),
  } as unknown as AssessmentAttemptRepository;
}

function createExecutionProvider() {
  const provider: AssessmentExecutionProvider = {
    requestExecution: vi.fn(async (input) => ({
      executionRequestId: input.executionRequestId,
      status: 'SUCCEEDED',
      stdout: 'fixture',
      exitCode: 0,
      provider: 'fixture-assessment-execution-provider',
      metadata: { fixtureExecutionCase: 'success' },
    })),
    getExecutionResult: vi.fn(async () => null),
    cancelExecution: vi.fn(async () => undefined),
  };
  return provider;
}

describe('RequestAssessmentCodeExecutionUseCase', () => {
  it('requires context', async () => {
    const useCase = new RequestAssessmentCodeExecutionUseCase(
      {} as AssessmentAttemptRepository,
      new AssessmentExecutionReservationService(),
      createExecutionProvider(),
      createPermissionEvaluator(true),
    );

    await expect(useCase.execute(
      createAssessmentRequestContextWithoutWorkspace(),
      'attempt-1',
      { answerId: 'answer-1' },
    )).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('requires actor id in workspace context', async () => {
    const useCase = new RequestAssessmentCodeExecutionUseCase(
      {} as AssessmentAttemptRepository,
      new AssessmentExecutionReservationService(),
      createExecutionProvider(),
      createPermissionEvaluator(true),
    );

    await expect(useCase.execute(
      {
        ...createAssessmentRequestContext(),
        workspace: {
          tenantId: TEST_TENANT_ID,
          workspaceId: TEST_WORKSPACE_ID,
        },
      },
      'attempt-1',
      { answerId: 'answer-1' },
    )).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('checks permission before requesting execution', async () => {
    const provider = createExecutionProvider();
    const useCase = new RequestAssessmentCodeExecutionUseCase(
      createAttemptRepo(createAttempt()),
      new AssessmentExecutionReservationService(),
      provider,
      createPermissionEvaluator(false),
    );

    await expect(useCase.execute(
      createAssessmentRequestContext(),
      'attempt-1',
      { answerId: 'answer-1' },
    )).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(provider.requestExecution).not.toHaveBeenCalled();
  });

  it('rejects non-code answers', async () => {
    const provider = createExecutionProvider();
    const useCase = new RequestAssessmentCodeExecutionUseCase(
      createAttemptRepo(createAttempt('MCQ')),
      new AssessmentExecutionReservationService(),
      provider,
      createPermissionEvaluator(true),
    );

    await expect(useCase.execute(
      createAssessmentRequestContext(),
      'attempt-1',
      { answerId: 'answer-1' },
    )).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(provider.requestExecution).not.toHaveBeenCalled();
  });

  it('rejects cross-workspace attempts', async () => {
    const attempt = AssessmentAttempt.restore({
      ...createAttempt(),
      workspaceId: 'workspace-2',
    });
    const useCase = new RequestAssessmentCodeExecutionUseCase(
      createAttemptRepo(attempt),
      new AssessmentExecutionReservationService(),
      createExecutionProvider(),
      createPermissionEvaluator(true),
    );

    await expect(useCase.execute(
      createAssessmentRequestContext(),
      attempt.id,
      { answerId: 'answer-1' },
    )).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('calls provider exactly once and does not mutate grading result state', async () => {
    const attempt = createAttempt();
    const initialGradingStatus = attempt.result?.gradingStatus;
    const provider = createExecutionProvider();
    const attemptRepo = createAttemptRepo(attempt);
    const useCase = new RequestAssessmentCodeExecutionUseCase(
      attemptRepo,
      new AssessmentExecutionReservationService(),
      provider,
      createPermissionEvaluator(true),
    );

    const response = await useCase.execute(createAssessmentRequestContext(), attempt.id, {
      answerId: 'answer-1',
      metadata: { fixtureExecutionCase: 'success' },
    });

    expect(provider.requestExecution).toHaveBeenCalledTimes(1);
    expect(response.request.kind).toBe(QuestionKindEnum.CODE);
    expect(response.result.status).toBe('SUCCEEDED');
    expect(attempt.result?.gradingStatus).toBe(initialGradingStatus);
    expect(vi.mocked(attemptRepo.save)).not.toHaveBeenCalled();
  });
});
