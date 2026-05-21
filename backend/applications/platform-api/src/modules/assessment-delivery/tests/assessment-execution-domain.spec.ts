import { describe, expect, it } from 'vitest';
import {
  AssessmentExecutionLanguageEnum,
  assertValidAssessmentExecutionLanguage,
  AssessmentExecutionResourceLimits,
  AssessmentExecutionRequest,
} from '../domain/index.js';

describe('Assessment execution domain', () => {
  it('validates known execution languages', () => {
    expect(assertValidAssessmentExecutionLanguage(AssessmentExecutionLanguageEnum.JAVASCRIPT)).toBe(
      'javascript',
    );
    expect(assertValidAssessmentExecutionLanguage(AssessmentExecutionLanguageEnum.PYTHON)).toBe(
      'python',
    );
  });

  it('rejects invalid execution languages', () => {
    expect(() => assertValidAssessmentExecutionLanguage('')).toThrowError(
      'Invalid AssessmentExecutionLanguage',
    );
    expect(() => assertValidAssessmentExecutionLanguage('kotlin')).toThrowError(
      'Invalid AssessmentExecutionLanguage',
    );
  });

  it('rejects invalid resource limits', () => {
    expect(() =>
      AssessmentExecutionResourceLimits.create({ timeoutMs: 0, memoryMb: 128 }),
    ).toThrowError();
    expect(() =>
      AssessmentExecutionResourceLimits.create({ timeoutMs: 1000, memoryMb: -5 }),
    ).toThrowError();
    expect(() =>
      AssessmentExecutionResourceLimits.create({ timeoutMs: 1000, memoryMb: 256, cpuCount: 0 }),
    ).toThrowError();
  });

  it('creates execution request in reserved state', () => {
    const request = AssessmentExecutionRequest.createReserved({
      id: 'execution-1',
      tenantId: 'tenant-1',
      workspaceId: 'workspace-1',
      attemptId: 'attempt-1',
      answerId: 'answer-1',
      questionId: 'question-1',
      kind: 'CODE',
      resourceLimits: AssessmentExecutionResourceLimits.create({ timeoutMs: 1500, memoryMb: 256 }),
      requestedByPrincipalId: 'principal-1',
      metadata: {},
    });

    expect(request.status).toBe('RESERVED');
    expect(request.kind).toBe('CODE');
  });
});
