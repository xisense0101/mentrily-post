import { describe, expect, it } from 'vitest';
import { toAnswerPayload } from '../state';

describe('toAnswerPayload — CODE kind', () => {
  it('returns sourceCode and language from object value', () => {
    const result = toAnswerPayload({
      questionKind: 'CODE',
      value: { language: 'python', sourceCode: 'print("hello")' },
    });
    expect(result).toEqual({ sourceCode: 'print("hello")', language: 'python' });
  });

  it('returns sourceCode without language when language not set', () => {
    const result = toAnswerPayload({
      questionKind: 'CODE',
      value: { sourceCode: 'console.log("hi")' },
    });
    expect(result).toEqual({ sourceCode: 'console.log("hi")' });
  });

  it('returns sourceCode from plain string value (backward compat)', () => {
    const result = toAnswerPayload({
      questionKind: 'CODE',
      value: 'some code',
    });
    expect(result).toEqual({ sourceCode: 'some code' });
  });

  it('returns empty sourceCode for null value', () => {
    const result = toAnswerPayload({
      questionKind: 'CODE',
      value: null,
    });
    expect(result).toEqual({ sourceCode: '' });
  });

  it('does not include provider internals in answer payload', () => {
    const result = toAnswerPayload({
      questionKind: 'CODE',
      value: { language: 'python', sourceCode: 'x=1' },
    });
    expect(result).not.toHaveProperty('providerUrl');
    expect(result).not.toHaveProperty('submissionToken');
    expect(result).not.toHaveProperty('executionId');
    expect(result).not.toHaveProperty('verdict');
  });

  it('backend payload is { language, sourceCode } only', () => {
    const result = toAnswerPayload({
      questionKind: 'CODE',
      value: { language: 'javascript', sourceCode: 'console.log(1)' },
    });
    expect(Object.keys(result).sort()).toEqual(['language', 'sourceCode']);
  });
});
