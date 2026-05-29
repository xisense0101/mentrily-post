import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { PERMISSION_EVALUATOR, type PermissionEvaluator } from '@mentrily/service-core';
import { AppModule } from '../../app.module.js';
import { registerCorrelationIdHook } from '../../../foundation/correlation-id.hook.js';

describe.sequential('Code Execution API (integration)', () => {
  let app: NestFastifyApplication;
  const allowedPermissions = new Set<string>();

  const creatorHeaders = {
    'x-request-id': 'e1111111-1111-4111-8111-111111111111',
    'x-correlation-id': 'e2222222-2222-4222-8222-222222222222',
    'x-tenant-id': 'e3333333-3333-4333-8333-333333333333',
    'x-workspace-id': 'e4444444-4444-4444-8444-444444444444',
    'x-actor-id': 'e5555555-5555-4555-8555-555555555555',
  } as const;

  beforeAll(async () => {
    const permissionEvaluator: PermissionEvaluator = {
      evaluate: async (req) => ({
        allowed: allowedPermissions.has(req.permission),
      }),
    };

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PERMISSION_EVALUATOR)
      .useValue(permissionEvaluator)
      .compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter(), {
      rawBody: true,
    });
    registerCorrelationIdHook(app.getHttpAdapter().getInstance());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  beforeEach(() => {
    allowedPermissions.clear();
    allowedPermissions.add('workspace.read');
  });

  afterAll(async () => {
    await app.close();
  });

  function expectHttpStatus(
    response: { statusCode: number; body: string },
    expected: number,
  ): void {
    if (response.statusCode !== expected) {
      throw new Error(
        `Expected HTTP ${expected} but received ${response.statusCode}. Body: ${response.body}`,
      );
    }
  }

  describe('GET /workspace/code-execution/languages', () => {
    it('returns the allowlist of supported languages', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/workspace/code-execution/languages',
        headers: creatorHeaders,
      });

      expectHttpStatus(res, 200);
      const body = res.json<any[]>();
      expect(body).toBeInstanceOf(Array);
      expect(body.map((l) => l.id)).toEqual(['javascript', 'python', 'cpp', 'java']);
      expect(body[0]).toHaveProperty('displayName');
      expect(body[0]).toHaveProperty('fileExtension');
    });

    it('blocks request if user lacks workspace.read permission', async () => {
      allowedPermissions.delete('workspace.read');

      const res = await app.inject({
        method: 'GET',
        url: '/workspace/code-execution/languages',
        headers: creatorHeaders,
      });

      expectHttpStatus(res, 403);
    });
  });

  describe('POST /workspace/code-execution/sample-run', () => {
    it('successfully runs JavaScript code and returns ACCEPTED verdict', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/workspace/code-execution/sample-run',
        headers: creatorHeaders,
        payload: {
          language: 'javascript',
          sourceCode: 'console.log("Hello, World!");',
        },
      });

      expectHttpStatus(res, 201);
      const data = res.json<any>();
      expect(data.status).toBe('COMPLETED');
      expect(data.verdict).toBe('ACCEPTED');
      expect(data.stdout).toBe('Hello, World!');
      expect(data.stderr).toBeUndefined();
      expect(data.compileOutput).toBeUndefined();
      expect(data.executionTimeMs).toBeDefined();
      expect(data.memoryKb).toBeDefined();
      expect(data.createdAt).toBeDefined();
      expect(data.completedAt).toBeDefined();
    });

    it('successfully propagates stdin to stdout in fixture', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/workspace/code-execution/sample-run',
        headers: creatorHeaders,
        payload: {
          language: 'python',
          sourceCode: 'import sys; print(sys.stdin.read())',
          stdin: 'hello test input',
        },
      });

      expectHttpStatus(res, 201);
      const data = res.json<any>();
      expect(data.stdout).toBe('Echo stdin: hello test input');
    });

    it('normalizes simulated compile error', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/workspace/code-execution/sample-run',
        headers: creatorHeaders,
        payload: {
          language: 'javascript',
          sourceCode: 'console.log("hello" // simulate:COMPILE_ERROR',
        },
      });

      expectHttpStatus(res, 201);
      const data = res.json<any>();
      expect(data.status).toBe('COMPLETED');
      expect(data.verdict).toBe('COMPILE_ERROR');
      expect(data.compileOutput).toContain('SyntaxError');
    });

    it('normalizes simulated runtime error', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/workspace/code-execution/sample-run',
        headers: creatorHeaders,
        payload: {
          language: 'javascript',
          sourceCode: '// simulate:RUNTIME_ERROR',
        },
      });

      expectHttpStatus(res, 201);
      const data = res.json<any>();
      expect(data.status).toBe('COMPLETED');
      expect(data.verdict).toBe('RUNTIME_ERROR');
      expect(data.stderr).toContain('RuntimeError');
    });

    it('normalizes simulated timeout (TIME_LIMIT_EXCEEDED)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/workspace/code-execution/sample-run',
        headers: creatorHeaders,
        payload: {
          language: 'javascript',
          sourceCode: '// simulate:TIME_LIMIT_EXCEEDED',
        },
      });

      expectHttpStatus(res, 201);
      const data = res.json<any>();
      expect(data.status).toBe('FAILED');
      expect(data.verdict).toBe('TIME_LIMIT_EXCEEDED');
    });

    it('normalizes simulated memory limit exceeded', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/workspace/code-execution/sample-run',
        headers: creatorHeaders,
        payload: {
          language: 'javascript',
          sourceCode: '// simulate:MEMORY_LIMIT_EXCEEDED',
        },
      });

      expectHttpStatus(res, 201);
      const data = res.json<any>();
      expect(data.status).toBe('FAILED');
      expect(data.verdict).toBe('MEMORY_LIMIT_EXCEEDED');
    });

    it('normalizes simulated provider unavailable safely without leaking internal details', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/workspace/code-execution/sample-run',
        headers: creatorHeaders,
        payload: {
          language: 'javascript',
          sourceCode: '// simulate:PROVIDER_UNAVAILABLE',
        },
      });

      expectHttpStatus(res, 201);
      const data = res.json<any>();
      expect(data.status).toBe('FAILED');
      expect(data.verdict).toBe('PROVIDER_UNAVAILABLE');
      // Verify safe message
      expect(data.stderr).toBe('Execution provider encountered an internal error.');
      // Verify no provider trace or secrets leaked
      expect(data.providerTraceId).toBeUndefined();
    });

    it('truncates oversized execution output in response', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/workspace/code-execution/sample-run',
        headers: creatorHeaders,
        payload: {
          language: 'javascript',
          sourceCode: '// simulate:OUTPUT_LIMIT_EXCEEDED',
        },
      });

      expectHttpStatus(res, 201);
      const data = res.json<any>();
      expect(data.verdict).toBe('OUTPUT_LIMIT_EXCEEDED');
      expect(data.stdout).toContain('[Truncated - output limit exceeded]');
    });

    it('runs public test cases and returns pass/fail results', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/workspace/code-execution/sample-run',
        headers: creatorHeaders,
        payload: {
          language: 'javascript',
          sourceCode: 'console.log("hello")',
          publicTestCases: [
            {
              input: 'test1',
              expectedOutput: 'Echo stdin: test1',
            },
            {
              input: 'test2',
              expectedOutput: 'wrong expected output',
            },
          ],
        },
      });

      expectHttpStatus(res, 201);
      const data = res.json<any>();
      expect(data.testResults).toBeDefined();
      expect(data.testResults).toHaveLength(2);
      expect(data.testResults[0].passed).toBe(true);
      expect(data.testResults[1].passed).toBe(false);
      expect(data.testResults[1].verdict).toBe('WRONG_ANSWER');
      // Overall verdict should be WRONG_ANSWER because one test case failed
      expect(data.verdict).toBe('WRONG_ANSWER');
    });

    it('blocks request if unsupported language', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/workspace/code-execution/sample-run',
        headers: creatorHeaders,
        payload: {
          language: 'unsupported_lang',
          sourceCode: 'print(1)',
        },
      });

      expectHttpStatus(res, 400);
      const data = res.json<any>();
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('Unsupported language');
    });

    it('blocks request if oversized sourceCode', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/workspace/code-execution/sample-run',
        headers: creatorHeaders,
        payload: {
          language: 'javascript',
          sourceCode: 'a'.repeat(65537),
        },
      });

      expectHttpStatus(res, 400);
      const data = res.json<any>();
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('Source code exceeds limit');
    });

    it('blocks request if too many public test cases', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/workspace/code-execution/sample-run',
        headers: creatorHeaders,
        payload: {
          language: 'javascript',
          sourceCode: 'console.log(1)',
          publicTestCases: Array(11).fill({ input: 'test' }),
        },
      });

      expectHttpStatus(res, 400);
      const data = res.json<any>();
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('Public test cases exceed limit');
    });

    it('blocks request if public test case input is oversized', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/workspace/code-execution/sample-run',
        headers: creatorHeaders,
        payload: {
          language: 'javascript',
          sourceCode: 'console.log(1)',
          publicTestCases: [{ input: 'a'.repeat(16385) }],
        },
      });

      expectHttpStatus(res, 400);
      const data = res.json<any>();
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('Public test case input exceeds limit');
    });

    it('blocks request if public test case expected output is oversized', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/workspace/code-execution/sample-run',
        headers: creatorHeaders,
        payload: {
          language: 'javascript',
          sourceCode: 'console.log(1)',
          publicTestCases: [{ input: 'test', expectedOutput: 'a'.repeat(16385) }],
        },
      });

      expectHttpStatus(res, 400);
      const data = res.json<any>();
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('Public test case expected output exceeds limit');
    });

    it('blocks request if executionMode is RESERVED_GRADING_RUN', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/workspace/code-execution/sample-run',
        headers: creatorHeaders,
        payload: {
          language: 'javascript',
          sourceCode: 'console.log(1)',
          executionMode: 'RESERVED_GRADING_RUN',
        },
      });

      expectHttpStatus(res, 400);
      const data = res.json<any>();
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('GRADING_RUN_NOT_AVAILABLE');
    });

    it('blocks request if user lacks workspace.read permission', async () => {
      allowedPermissions.delete('workspace.read');

      const res = await app.inject({
        method: 'POST',
        url: '/workspace/code-execution/sample-run',
        headers: creatorHeaders,
        payload: {
          language: 'javascript',
          sourceCode: 'console.log(1)',
        },
      });

      expectHttpStatus(res, 403);
    });
  });
});
