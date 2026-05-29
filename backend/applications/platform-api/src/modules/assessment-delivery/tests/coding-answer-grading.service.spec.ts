import { describe, expect, it, vi } from 'vitest';
import { CodingAnswerGradingService } from '../application/services/coding-answer-grading.service.js';
import { CodeExecutionPolicyService } from '../../code-execution/application/code-execution-policy.service.js';
import { CodeExecutionProvider } from '../../code-execution/application/code-execution-provider.js';
import {
  AssessmentAttemptAnswer,
  AssessmentQuestion,
  QuestionKindEnum,
  QuestionPoints,
} from '../domain/index.js';

describe('CodingAnswerGradingService', () => {
  const policyService = new CodeExecutionPolicyService();

  const createMockAnswer = (sourceCode: string, language: string) => {
    return AssessmentAttemptAnswer.restore({
      id: 'answer-1',
      attemptId: 'attempt-1',
      questionId: 'question-1',
      questionKind: QuestionKindEnum.CODE,
      status: 'SUBMITTED',
      savedAt: new Date(),
      submittedAt: new Date(),
      answer: { sourceCode, language },
      metadata: {},
    });
  };

  const createMockQuestion = (points: number, testCases: any[]) => {
    return AssessmentQuestion.create({
      id: 'question-1',
      assessmentId: 'assessment-1',
      kind: QuestionKindEnum.CODE,
      title: 'Coding Question',
      prompt: { text: 'Prompt' },
      options: [],
      answerKey: null,
      points: QuestionPoints.create(points),
      gradingMode: 'AUTO',
      position: 0,
      metadata: {
        gradingTestCases: testCases,
      },
    });
  };

  it('grades CODE answer successfully when grading test cases match output', async () => {
    const mockProvider = {
      providerName: 'mock-provider',
      execute: vi.fn(async () => ({
        status: 'SUCCESS',
        verdict: 'ACCEPTED',
        stdout: '4\n',
        stderr: '',
      })),
    } as unknown as CodeExecutionProvider;

    const gradingService = new CodingAnswerGradingService(policyService, mockProvider);
    const answer = createMockAnswer('print(2+2)', 'python');
    const question = createMockQuestion(10, [
      { id: 'tc-1', input: '', expectedOutput: '4', visibility: 'HIDDEN_GRADED' },
    ]);

    const result = await gradingService.gradeAnswer(answer, question);
    expect(result.status).toBe('AUTO_GRADED');
    expect(result.score).toBe(10);
    expect(result.metadata?.publicTestResults).toEqual([]);
    expect(result.metadata?.passedHiddenCount).toBe(1);
    expect(result.metadata?.totalHiddenCount).toBe(1);
    expect(result.feedback?.publicTestResults).toEqual([]);
    expect(result.feedback?.passedHiddenCount).toBe(1);
    expect(result.feedback?.totalHiddenCount).toBe(1);
  });

  it('grades CODE answer as 0 score when output does not match expected (whitespace normalized)', async () => {
    const mockProvider = {
      providerName: 'mock-provider',
      execute: vi.fn(async () => ({
        status: 'SUCCESS',
        verdict: 'ACCEPTED',
        stdout: '5\n',
        stderr: '',
      })),
    } as unknown as CodeExecutionProvider;

    const gradingService = new CodingAnswerGradingService(policyService, mockProvider);
    const answer = createMockAnswer('print(2+3)', 'python');
    const question = createMockQuestion(10, [
      { id: 'tc-1', input: '', expectedOutput: '4', visibility: 'HIDDEN_GRADED' },
    ]);

    const result = await gradingService.gradeAnswer(answer, question);
    expect(result.status).toBe('AUTO_GRADED');
    expect(result.score).toBe(0);
    expect(result.metadata?.passedHiddenCount).toBe(0);
    expect(result.metadata?.totalHiddenCount).toBe(1);
  });

  it('grades CODE answer as 0 score on compile/runtime/timeout error', async () => {
    const mockProvider = {
      providerName: 'mock-provider',
      execute: vi.fn(async () => ({
        status: 'SUCCESS',
        verdict: 'COMPILE_ERROR',
        stdout: '',
        stderr: 'SyntaxError',
      })),
    } as unknown as CodeExecutionProvider;

    const gradingService = new CodingAnswerGradingService(policyService, mockProvider);
    const answer = createMockAnswer('invalid code', 'python');
    const question = createMockQuestion(10, [
      { id: 'tc-1', input: '', expectedOutput: '4', visibility: 'HIDDEN_GRADED' },
    ]);

    const result = await gradingService.gradeAnswer(answer, question);
    expect(result.status).toBe('AUTO_GRADED');
    expect(result.score).toBe(0);
    expect(result.metadata?.passedHiddenCount).toBe(0);
    expect(result.metadata?.totalHiddenCount).toBe(1);
  });

  it('grades CODE answer as PENDING_MANUAL_REVIEW when provider is unavailable', async () => {
    const mockProvider = {
      providerName: 'mock-provider',
      execute: vi.fn(async () => ({
        status: 'ERROR',
        verdict: 'PROVIDER_UNAVAILABLE',
      })),
    } as unknown as CodeExecutionProvider;

    const gradingService = new CodingAnswerGradingService(policyService, mockProvider);
    const answer = createMockAnswer('print(2+2)', 'python');
    const question = createMockQuestion(10, [
      { id: 'tc-1', input: '', expectedOutput: '4', visibility: 'HIDDEN_GRADED' },
    ]);

    const result = await gradingService.gradeAnswer(answer, question);
    expect(result.status).toBe('PENDING_MANUAL_REVIEW');
    expect(result.metadata?.reason).toBe('provider_unavailable');
    expect(result.score).toBeUndefined();
  });

  it('provider unavailable on hidden test does not expose hidden test id', async () => {
    const mockProvider = {
      providerName: 'mock-provider',
      execute: vi.fn(async () => ({
        status: 'ERROR',
        verdict: 'PROVIDER_UNAVAILABLE',
      })),
    } as unknown as CodeExecutionProvider;

    const gradingService = new CodingAnswerGradingService(policyService, mockProvider);
    const answer = createMockAnswer('print(2+2)', 'python');
    const question = createMockQuestion(10, [
      { id: 'hidden-tc-leak-test', input: '', expectedOutput: '4', visibility: 'HIDDEN_GRADED' },
    ]);

    const result = await gradingService.gradeAnswer(answer, question);
    expect(result.status).toBe('PENDING_MANUAL_REVIEW');
    expect(result.metadata?.reason).toBe('provider_unavailable');
    expect(result.metadata?.failedTestCaseId).toBeUndefined();
    expect(JSON.stringify(result)).not.toContain('hidden-tc-leak-test');
  });

  it('grades CODE answer as PENDING_MANUAL_REVIEW when no grading tests are present', async () => {
    const mockProvider = {
      providerName: 'mock-provider',
      execute: vi.fn(),
    } as unknown as CodeExecutionProvider;

    const gradingService = new CodingAnswerGradingService(policyService, mockProvider);
    const answer = createMockAnswer('print(2+2)', 'python');
    const question = createMockQuestion(10, []);

    const result = await gradingService.gradeAnswer(answer, question);
    expect(result.status).toBe('PENDING_MANUAL_REVIEW');
    expect(result.metadata?.reason).toBe('no_grading_tests_exist');
  });

  it('grades CODE answer as 0 score when invalid language or payload validation fails', async () => {
    const mockProvider = {
      providerName: 'mock-provider',
      execute: vi.fn(),
    } as unknown as CodeExecutionProvider;

    const gradingService = new CodingAnswerGradingService(policyService, mockProvider);
    const answer = createMockAnswer('print(2+2)', 'invalid-lang');
    const question = createMockQuestion(10, [
      { id: 'tc-1', input: '', expectedOutput: '4', visibility: 'HIDDEN_GRADED' },
    ]);

    const result = await gradingService.gradeAnswer(answer, question);
    expect(result.status).toBe('AUTO_GRADED');
    expect(result.score).toBe(0);
    expect(result.metadata?.error).toBe('unsupported_language');
  });

  it('scores weighted test cases correctly', async () => {
    const mockProvider = {
      providerName: 'mock-provider',
      execute: vi
        .fn()
        .mockResolvedValueOnce({
          status: 'SUCCESS',
          verdict: 'ACCEPTED',
          stdout: '4\n',
        })
        .mockResolvedValueOnce({
          status: 'SUCCESS',
          verdict: 'WRONG_ANSWER',
          stdout: 'wrong\n',
        }),
    } as unknown as CodeExecutionProvider;

    const gradingService = new CodingAnswerGradingService(policyService, mockProvider);
    const answer = createMockAnswer('print(2+2)', 'python');
    const question = createMockQuestion(10, [
      { id: 'tc-1', input: '', expectedOutput: '4', visibility: 'HIDDEN_GRADED', weight: 3 },
      { id: 'tc-2', input: '', expectedOutput: '5', visibility: 'HIDDEN_GRADED', weight: 1 },
    ]);

    const result = await gradingService.gradeAnswer(answer, question);
    expect(result.status).toBe('AUTO_GRADED');
    expect(result.score).toBe(7.5);
  });

  it('never exposes hidden test IDs, inputs, expectedOutput, stdout, or stderr in learner feedback, returning only aggregate statistics', async () => {
    const mockProvider = {
      providerName: 'mock-provider',
      execute: vi
        .fn()
        .mockResolvedValueOnce({
          status: 'SUCCESS',
          verdict: 'ACCEPTED',
          stdout: '4\n',
          stderr: 'some debug error',
        })
        .mockResolvedValueOnce({
          status: 'SUCCESS',
          verdict: 'ACCEPTED',
          stdout: '5\n',
        }),
    } as unknown as CodeExecutionProvider;

    const gradingService = new CodingAnswerGradingService(policyService, mockProvider);
    const answer = createMockAnswer('print(2+2)', 'python');
    const question = createMockQuestion(10, [
      { id: 'tc-1', input: 'secret_input_1', expectedOutput: '4', visibility: 'HIDDEN_GRADED' },
      { id: 'tc-2', input: 'public_input_2', expectedOutput: '5', visibility: 'PUBLIC_GRADED' },
    ]);

    const result = await gradingService.gradeAnswer(answer, question);
    expect(result.status).toBe('AUTO_GRADED');

    expect(result.metadata?.publicTestResults).toEqual([
      {
        id: 'tc-2',
        input: 'public_input_2',
        expectedOutput: '5',
        stdout: '5\n',
        verdict: 'ACCEPTED',
        passed: true,
        visibility: 'PUBLIC_GRADED',
      },
    ]);
    expect(result.metadata?.passedHiddenCount).toBe(1);
    expect(result.metadata?.totalHiddenCount).toBe(1);

    expect(result.feedback?.publicTestResults).toEqual([
      {
        id: 'tc-2',
        input: 'public_input_2',
        expectedOutput: '5',
        stdout: '5\n',
        verdict: 'ACCEPTED',
        passed: true,
        visibility: 'PUBLIC_GRADED',
      },
    ]);
    expect(result.feedback?.passedHiddenCount).toBe(1);
    expect(result.feedback?.totalHiddenCount).toBe(1);

    // Assert that individual hidden test case details are not present anywhere in the result payload
    expect(JSON.stringify(result)).not.toContain('tc-1');
    expect(JSON.stringify(result)).not.toContain('secret_input_1');
  });

  it('sanitizes raw provider/internal execution error details in metadata', async () => {
    const mockProvider = {
      providerName: 'mock-provider',
      execute: vi.fn().mockRejectedValue(new Error('Internal server error connection refused')),
    } as unknown as CodeExecutionProvider;

    const gradingService = new CodingAnswerGradingService(policyService, mockProvider);
    const answer = createMockAnswer('print(2+2)', 'python');
    const question = createMockQuestion(10, [
      { id: 'tc-1', input: '', expectedOutput: '4', visibility: 'HIDDEN_GRADED' },
    ]);

    const result = await gradingService.gradeAnswer(answer, question);
    expect(result.status).toBe('PENDING_MANUAL_REVIEW');
    expect(result.metadata?.reason).toBe('provider_error');
    expect(result.metadata?.error).toBe('Execution provider error. Manual review required.');
    expect(result.feedback?.message).toBe(
      'An unexpected error occurred during execution grading. Manual review required.',
    );

    // Assert that the raw error details (e.g. connection refused) are not exposed in returned metadata/feedback
    expect(JSON.stringify(result)).not.toContain('connection refused');
    expect(JSON.stringify(result)).not.toContain('Internal server error');
  });
});
