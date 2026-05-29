import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AuditRecorder, PermissionEvaluator, RequestContext } from '@mentrily/service-core';
import { CodeExecutionLimitContract } from '@mentrily/contract-catalog';
import { PrismaService } from '@mentrily/data-platform';
import { CodeExecutionTrackerService } from '../application/code-execution-tracker.service.js';
import { CodeExecutionProviderRunner } from '../application/code-execution-provider-runner.js';
import { CodeExecutionProvider } from '../application/code-execution-provider.js';
import { RunCodeSampleUseCase } from '../application/use-cases/run-code-sample.use-case.js';
import { CodeExecutionPolicyService } from '../application/code-execution-policy.service.js';

describe('Code Execution Reliability, Limits & Abuse Protection', () => {
  describe('CodeExecutionTrackerService', () => {
    let tracker: CodeExecutionTrackerService;

    beforeEach(() => {
      tracker = new CodeExecutionTrackerService();
    });

    it('enforces per-learner rate limit (max 5 runs per minute)', async () => {
      const workspaceId = 'ws-1';
      const learnerId = 'learner-1';

      // First 5 runs should succeed
      for (let i = 0; i < 5; i++) {
        const { release } = await tracker.acquireAndCheckLimits(workspaceId, learnerId);
        release();
      }

      // 6th run should be rate limited
      await expect(tracker.acquireAndCheckLimits(workspaceId, learnerId)).rejects.toThrowError(
        /Learner rate limit exceeded/,
      );
    });

    it('enforces per attempt/question limit (max 30 runs)', async () => {
      const workspaceId = 'ws-1';
      const attemptId = 'attempt-1';
      const questionId = 'question-1';

      // 30 runs should succeed
      for (let i = 0; i < 30; i++) {
        const { release } = await tracker.acquireAndCheckLimits(
          workspaceId,
          `learner-${i}`,
          attemptId,
          questionId,
        );
        release();
      }

      // 31st run should be blocked
      await expect(
        tracker.acquireAndCheckLimits(workspaceId, 'learner-next', attemptId, questionId),
      ).rejects.toThrowError(/Question run limit exceeded/);
    });

    it('enforces learner-attempt-question active concurrency limit (max 1 active run)', async () => {
      const workspaceId = 'ws-1';
      const learnerId = 'learner-1';
      const attemptId = 'attempt-1';
      const questionId = 'question-1';

      // Acquire first run
      const { release: release1 } = await tracker.acquireAndCheckLimits(
        workspaceId,
        learnerId,
        attemptId,
        questionId,
      );

      // Second concurrent acquire should be blocked
      await expect(
        tracker.acquireAndCheckLimits(workspaceId, learnerId, attemptId, questionId),
      ).rejects.toThrowError(/An execution run is already active/);

      // Release first run
      release1();

      // Third acquire should now succeed
      const { release: release3 } = await tracker.acquireAndCheckLimits(
        workspaceId,
        learnerId,
        attemptId,
        questionId,
      );
      release3();
    });

    it('enforces workspace active concurrency limit (max 20 concurrent runs)', async () => {
      const workspaceId = 'ws-1';
      const learnerId = 'learner-1';

      const releases = [];
      // Acquire 20 concurrent runs
      for (let i = 0; i < 20; i++) {
        const { release } = await tracker.acquireAndCheckLimits(workspaceId, `${learnerId}-${i}`);
        releases.push(release);
      }

      // 21st concurrent acquire should be blocked
      await expect(
        tracker.acquireAndCheckLimits(workspaceId, `${learnerId}-21`),
      ).rejects.toThrowError(/Workspace concurrency limit reached/);

      // Release one run
      releases[0]?.();

      // Now we can acquire one more
      const { release } = await tracker.acquireAndCheckLimits(workspaceId, `${learnerId}-21`);
      release();
    });

    it('uses idempotency key to cache results and concurrent promises', async () => {
      const workspaceId = 'ws-1';
      const learnerId = 'learner-1';
      const idempotencyKey = 'key-123';

      // First run check
      const check1 = await tracker.acquireAndCheckLimits(
        workspaceId,
        learnerId,
        null,
        null,
        idempotencyKey,
      );
      expect(check1.cachedResult).toBeUndefined();
      expect(check1.cachedPromise).toBeUndefined();

      // Register active promise
      const mockResult = {
        status: 'COMPLETED' as const,
        verdict: 'ACCEPTED' as const,
        language: 'javascript',
      };
      const promise = Promise.resolve(mockResult);
      tracker.registerPromise(workspaceId, learnerId, idempotencyKey, promise);

      // Duplicate concurrent run check should return the promise
      const check2 = await tracker.acquireAndCheckLimits(
        workspaceId,
        learnerId,
        null,
        null,
        idempotencyKey,
      );
      expect(check2.cachedPromise).toBe(promise);

      // Await promise and register result
      const result = await promise;
      tracker.registerResult(workspaceId, learnerId, idempotencyKey, result);

      // Duplicate run check after completion should return the completed result
      const check3 = await tracker.acquireAndCheckLimits(
        workspaceId,
        learnerId,
        null,
        null,
        idempotencyKey,
      );
      expect(check3.cachedResult).toEqual(mockResult);
    });
  });

  describe('CodeExecutionProviderRunner', () => {
    const mockLimits: CodeExecutionLimitContract = {
      maxSourceBytes: 100,
      maxStdInBytes: 100,
      maxOutputBytes: 100,
      cpuTimeLimitMs: 1000,
      wallTimeLimitMs: 1000,
      memoryLimitKb: 1024,
      maxPublicTestCases: 10,
      maxPublicTestCaseInputBytes: 100,
      maxPublicTestCaseExpectedOutputBytes: 100,
    };

    it('retries transient PROVIDER_UNAVAILABLE up to 3 times', async () => {
      const mockDelegate: CodeExecutionProvider = {
        providerName: 'mock-provider',
        getSupportedLanguages: async () => ['javascript'],
        execute: vi
          .fn()
          .mockResolvedValueOnce({
            status: 'FAILED',
            verdict: 'PROVIDER_UNAVAILABLE',
            stdout: null,
            stderr: 'Transient error 1',
            executionTimeMs: null,
            memoryKb: null,
          })
          .mockResolvedValueOnce({
            status: 'FAILED',
            verdict: 'PROVIDER_UNAVAILABLE',
            stdout: null,
            stderr: 'Transient error 2',
            executionTimeMs: null,
            memoryKb: null,
          })
          .mockResolvedValueOnce({
            status: 'COMPLETED',
            verdict: 'ACCEPTED',
            stdout: 'Success Output',
            stderr: null,
            executionTimeMs: 150,
            memoryKb: 200,
          }),
      };

      const runner = new CodeExecutionProviderRunner(mockDelegate);
      const res = await runner.execute({
        providerLanguageId: 'javascript',
        sourceCode: 'console.log(1)',
        limits: mockLimits,
      });

      expect(res.verdict).toBe('ACCEPTED');
      expect(res.stdout).toBe('Success Output');
      expect(mockDelegate.execute).toHaveBeenCalledTimes(3);
    });

    it('returns PROVIDER_UNAVAILABLE on client timeout', async () => {
      const mockDelegate: CodeExecutionProvider = {
        providerName: 'mock-provider',
        getSupportedLanguages: async () => ['javascript'],
        // Never resolves to simulate hanging API connection
        execute: () => new Promise(() => {}),
      };

      const runner = new CodeExecutionProviderRunner(mockDelegate, 50);
      const res = await runner.execute({
        providerLanguageId: 'javascript',
        sourceCode: 'console.log(1)',
        limits: mockLimits,
      });

      expect(res.verdict).toBe('PROVIDER_UNAVAILABLE');
      expect(res.stderr).toContain('Execution provider encountered an internal error.');
    });
  });

  describe('RunCodeSampleUseCase & Audit Sanitization', () => {
    it('sanitizes audit logs for code execution runs', async () => {
      const policyService = new CodeExecutionPolicyService();
      const mockProvider: CodeExecutionProvider = {
        providerName: 'mock',
        getSupportedLanguages: async () => ['javascript'],
        execute: async () => ({
          status: 'COMPLETED',
          verdict: 'ACCEPTED',
          stdout: 'My sensitive stdout',
          stderr: 'My sensitive stderr',
          executionTimeMs: 120,
          memoryKb: 400,
        }),
      };
      const permissionEvaluator: PermissionEvaluator = {
        evaluate: async () => ({ allowed: true }),
      };
      const auditRecorder: AuditRecorder = {
        record: vi.fn(),
      };
      const trackerService = new CodeExecutionTrackerService();

      const mockPrisma = {
        assessmentAttempt: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'attempt-999',
            tenantId: 'tenant-123',
            workspaceId: 'workspace-456',
            learnerPrincipalId: 'actor-789',
            snapshot: {
              looseQuestions: [{ id: 'question-888' }],
              sections: [],
            },
          }),
        },
      } as unknown as PrismaService;

      const useCase = new RunCodeSampleUseCase(
        policyService,
        mockProvider,
        permissionEvaluator,
        auditRecorder,
        trackerService,
        mockPrisma,
      );

      const context: RequestContext = {
        workspace: {
          tenantId: 'tenant-123',
          workspaceId: 'workspace-456',
          actorId: 'actor-789',
        },
      } as unknown as RequestContext;

      const result = await useCase.execute(context, {
        language: 'javascript',
        sourceCode: 'console.log("secret");',
        stdin: 'sensitive stdin',
        executionMode: 'SAMPLE_RUN',
        attemptId: 'attempt-999',
        questionId: 'question-888',
      });

      expect(result.verdict).toBe('ACCEPTED');

      // Verify that audit log was recorded and was fully sanitized
      expect(auditRecorder.record).toHaveBeenCalledTimes(1);
      const auditCall = vi.mocked(auditRecorder.record).mock.calls[0];
      const event = auditCall?.[0];
      expect(event?.action).toBe('code-execution.sample-run');
      expect(event?.actorId).toBe('actor-789');

      // Check metadata fields
      const meta = event?.metadata;
      expect(meta?.tenantId).toBe('tenant-123');
      expect(meta?.workspaceId).toBe('workspace-456');
      expect(meta?.actorId).toBe('actor-789');
      expect(meta?.attemptId).toBe('attempt-999');
      expect(meta?.questionId).toBe('question-888');
      expect(meta?.verdict).toBe('ACCEPTED');
      expect(meta?.durationMs).toBe(120);

      // IMPORTANT: Ensure NO source code, stdin, stdout, stderr are present in the log metadata
      const metaString = JSON.stringify(meta);
      expect(metaString).not.toContain('secret');
      expect(metaString).not.toContain('sensitive');
      expect(metaString).not.toContain('stdout');
      expect(metaString).not.toContain('stderr');
    });
  });
});
