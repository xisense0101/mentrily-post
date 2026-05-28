import { describe, expect, it } from 'vitest';
import { CodeExecutionPolicyService } from '../application/code-execution-policy.service.js';

describe('CodeExecutionPolicyService', () => {
  const service = new CodeExecutionPolicyService();

  it('retrieves the supported languages list', () => {
    const list = service.getLanguages();
    expect(list.map((l) => l.id)).toEqual(['javascript', 'python', 'cpp', 'java']);
  });

  it('resolves language by id', () => {
    const js = service.getLanguageById('javascript');
    expect(js).toBeDefined();
    expect(js?.displayName).toBe('JavaScript');
    expect(service.getLanguageById('unsupported')).toBeUndefined();
  });

  it('validates requests against limits and supported languages', () => {
    // Valid request should not throw
    expect(() => service.validateRequest('javascript', 'console.log("hi");')).not.toThrow();

    // Unsupported language should throw validation error
    expect(() => service.validateRequest('cobol', 'display "hi".')).toThrowError(
      /Unsupported language/,
    );

    // Empty source code should throw validation error
    expect(() => service.validateRequest('javascript', '')).toThrowError(/Source code is required/);

    // Oversized source code should throw validation error
    const largeSource = 'a'.repeat(65537); // limit is 65536
    expect(() => service.validateRequest('javascript', largeSource)).toThrowError(
      /Source code exceeds limit/,
    );

    // Oversized stdin should throw validation error
    const largeStdin = 'a'.repeat(16385); // limit is 16384
    expect(() => service.validateRequest('javascript', 'print(1)', largeStdin)).toThrowError(
      /stdin exceeds limit/,
    );
  });

  it('sanitizes and truncates output safely without throwing', () => {
    expect(service.sanitizeOutput(null, 10)).toBeNull();
    expect(service.sanitizeOutput(undefined, 10)).toBeNull();

    const normalOutput = 'hello';
    expect(service.sanitizeOutput(normalOutput, 10)).toBe('hello');

    const oversizedOutput = 'abcdefghijk'; // 11 bytes
    const sanitized = service.sanitizeOutput(oversizedOutput, 5);
    expect(sanitized).toContain('abcde');
    expect(sanitized).toContain('[Truncated - output limit exceeded]');
  });
});
