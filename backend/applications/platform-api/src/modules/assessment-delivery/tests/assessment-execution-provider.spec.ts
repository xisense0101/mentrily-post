import { describe, expect, it } from 'vitest';
import {
  FixtureAssessmentExecutionProvider,
  NoopAssessmentExecutionProvider,
} from '../infrastructure/index.js';

describe('Assessment execution providers', () => {
  it('noop provider returns unavailable result without executing source', async () => {
    const provider = new NoopAssessmentExecutionProvider();

    const result = await provider.requestExecution({
      executionRequestId: 'execution-1',
      kind: 'CODE',
      language: 'typescript',
      source: 'throw new Error("should not run")',
      resourceLimits: { timeoutMs: 1000, memoryMb: 128 },
      metadata: {},
    });

    expect(result.status).toBe('PROVIDER_UNAVAILABLE');
    expect(result.error).toBe('execution provider unavailable');
    expect(await provider.getExecutionResult('execution-1')).toEqual(result);
  });

  it('fixture provider returns deterministic success fixture', async () => {
    const provider = new FixtureAssessmentExecutionProvider();

    const result = await provider.requestExecution({
      executionRequestId: 'execution-success',
      kind: 'CODE',
      language: 'typescript',
      source: 'ignored',
      resourceLimits: { timeoutMs: 1000, memoryMb: 128 },
      metadata: {
        fixtureExecutionCase: 'success',
        fixtureStdout: 'ok',
        fixtureExitCode: 0,
        fixtureDurationMs: 12,
      },
    });

    expect(result.status).toBe('SUCCEEDED');
    expect(result.stdout).toBe('ok');
    expect(result.exitCode).toBe(0);
    expect(result.durationMs).toBe(12);
  });

  it('fixture provider returns deterministic failed fixture', async () => {
    const provider = new FixtureAssessmentExecutionProvider();

    const result = await provider.requestExecution({
      executionRequestId: 'execution-failed',
      kind: 'CODE',
      language: 'python',
      source: 'ignored',
      resourceLimits: { timeoutMs: 1000, memoryMb: 128 },
      metadata: {
        fixtureExecutionCase: 'failed',
        fixtureStderr: 'assertion failed',
        fixtureExitCode: 1,
      },
    });

    expect(result.status).toBe('FAILED');
    expect(result.stderr).toBe('assertion failed');
    expect(result.exitCode).toBe(1);
  });

  it('fixture provider returns deterministic timeout fixture', async () => {
    const provider = new FixtureAssessmentExecutionProvider();

    const result = await provider.requestExecution({
      executionRequestId: 'execution-timeout',
      kind: 'CODE',
      language: 'go',
      source: 'ignored',
      resourceLimits: { timeoutMs: 1000, memoryMb: 128 },
      metadata: {
        fixtureExecutionCase: 'timeout',
        fixtureDurationMs: 1000,
      },
    });

    expect(result.status).toBe('TIMED_OUT');
    expect(result.durationMs).toBe(1000);
  });

  it('fixture provider rejects missing fixture metadata', async () => {
    const provider = new FixtureAssessmentExecutionProvider();

    await expect(
      provider.requestExecution({
        executionRequestId: 'execution-missing',
        kind: 'CODE',
        language: 'typescript',
        source: 'ignored',
        resourceLimits: { timeoutMs: 1000, memoryMb: 128 },
        metadata: {},
      }),
    ).rejects.toThrow('Fixture execution metadata is required');
  });
});
