import { describe, expect, it, vi } from 'vitest';
import { AssessmentExecutionReservationService } from '../application/services/index.js';
import { QuestionKindEnum } from '../domain/index.js';
import { createAssessmentRequestContext } from './assessment-test-fixtures.js';

describe('Assessment execution reservation', () => {
  const service = new AssessmentExecutionReservationService();

  it('identifies execution-required question kinds', () => {
    expect(service.isExecutionRequired({ questionKind: QuestionKindEnum.CODE })).toBe(true);
    expect(service.isExecutionRequired({ questionKind: QuestionKindEnum.NOTEBOOK })).toBe(true);
    expect(service.isExecutionRequired({ questionKind: QuestionKindEnum.MCQ })).toBe(false);
  });

  it('creates a reserved execution request for code answers', () => {
    const request = service.createReservedExecutionRequest({
      context: createAssessmentRequestContext(),
      attemptId: 'attempt-1',
      answerId: 'answer-1',
      questionId: 'question-1',
      questionKind: QuestionKindEnum.CODE,
      answer: { sourceCode: 'print(1)', language: 'python' },
    });

    expect(request?.status).toBe('RESERVED');
    expect(request?.kind).toBe('CODE');
  });

  it('returns null when execution is not required', () => {
    const request = service.createReservedExecutionRequest({
      context: createAssessmentRequestContext(),
      attemptId: 'attempt-1',
      answerId: 'answer-1',
      questionId: 'question-1',
      questionKind: QuestionKindEnum.MCQ,
      answer: { selectedOptionId: 'option-a' },
    });

    expect(request).toBeNull();
  });

  it('does not call any execution provider', () => {
    const provider = {
      requestExecution: vi.fn(),
      getExecutionResult: vi.fn(),
      cancelExecution: vi.fn(),
    };

    service.createReservedExecutionRequest({
      context: createAssessmentRequestContext(),
      attemptId: 'attempt-1',
      answerId: 'answer-1',
      questionId: 'question-1',
      questionKind: QuestionKindEnum.CODE,
      answer: { sourceCode: 'console.log(1)' },
    });

    expect(provider.requestExecution).not.toHaveBeenCalled();
    expect(provider.getExecutionResult).not.toHaveBeenCalled();
    expect(provider.cancelExecution).not.toHaveBeenCalled();
  });
});
