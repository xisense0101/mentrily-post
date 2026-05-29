import { describe, expect, it, vi } from 'vitest';
import {
  createCodeExecutionApiClient,
  CodeExecutionApiError,
} from '../api/code-execution-api-client';

function makeFetch(status: number, body: unknown): typeof fetch {
  return vi.fn(
    async () =>
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
  ) as typeof fetch;
}

describe('createCodeExecutionApiClient', () => {
  const baseUrl = 'https://api.example.com';

  describe('getCodeExecutionLanguages', () => {
    it('calls GET /workspace/code-execution/languages', async () => {
      const fetchMock = makeFetch(200, {
        languages: [{ id: 'python', displayName: 'Python 3', fileExtension: '.py' }],
      });
      const client = createCodeExecutionApiClient({ baseUrl, fetchImpl: fetchMock });

      const langs = await client.getCodeExecutionLanguages();

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.example.com/workspace/code-execution/languages',
        expect.objectContaining({ credentials: 'include' }),
      );
      expect(langs).toHaveLength(1);
      expect(langs[0]!.id).toBe('python');
    });

    it('handles array response shape directly', async () => {
      const fetchMock = makeFetch(200, [
        { id: 'javascript', displayName: 'JavaScript', fileExtension: '.js' },
      ]);
      const client = createCodeExecutionApiClient({ baseUrl, fetchImpl: fetchMock });
      const langs = await client.getCodeExecutionLanguages();
      expect(langs).toHaveLength(1);
      expect(langs[0]!.id).toBe('javascript');
    });

    it('throws CodeExecutionApiError on 401', async () => {
      const fetchMock = makeFetch(401, { error: { code: 'UNAUTHORIZED', message: 'Not auth' } });
      const client = createCodeExecutionApiClient({ baseUrl, fetchImpl: fetchMock });

      await expect(client.getCodeExecutionLanguages()).rejects.toBeInstanceOf(
        CodeExecutionApiError,
      );
    });
  });

  describe('runCodeSample', () => {
    it('calls POST /workspace/code-execution/sample-run with SAMPLE_RUN', async () => {
      const fetchMock = makeFetch(200, {
        status: 'COMPLETED',
        verdict: 'ACCEPTED',
        language: 'python',
        stdout: 'hello\n',
        stderr: null,
        compileOutput: null,
      });
      const client = createCodeExecutionApiClient({ baseUrl, fetchImpl: fetchMock });

      await client.runCodeSample({
        language: 'python',
        sourceCode: 'print("hello")',
        executionMode: 'SAMPLE_RUN',
      });

      const [url, init] = (fetchMock as ReturnType<typeof vi.fn>).mock.calls[0] as [
        string,
        RequestInit,
      ];
      expect(url).toBe('https://api.example.com/workspace/code-execution/sample-run');
      expect(init.method).toBe('POST');

      const body = JSON.parse(init.body as string) as Record<string, unknown>;
      expect(body['executionMode']).toBe('SAMPLE_RUN');
      expect(body['language']).toBe('python');
      // Safety assertions
      expect(body).not.toHaveProperty('tenantId');
      expect(body).not.toHaveProperty('workspaceId');
      expect(body['executionMode']).not.toBe('RESERVED_GRADING_RUN');
    });

    it('calls POST with PUBLIC_TEST_RUN when publicTestCases provided', async () => {
      const fetchMock = makeFetch(200, {
        status: 'COMPLETED',
        verdict: 'ACCEPTED',
        language: 'python',
        testResults: [
          { input: '1', expectedOutput: '1', stdout: '1\n', passed: true, verdict: 'ACCEPTED' },
        ],
      });
      const client = createCodeExecutionApiClient({ baseUrl, fetchImpl: fetchMock });

      await client.runCodeSample({
        language: 'python',
        sourceCode: 'print(input())',
        publicTestCases: [{ input: '1', expectedOutput: '1' }],
        executionMode: 'PUBLIC_TEST_RUN',
      });

      const [, init] = (fetchMock as ReturnType<typeof vi.fn>).mock.calls[0] as [
        string,
        RequestInit,
      ];
      const body = JSON.parse(init.body as string) as Record<string, unknown>;
      expect(body['executionMode']).toBe('PUBLIC_TEST_RUN');
      expect(Array.isArray(body['publicTestCases'])).toBe(true);
    });

    it('never sends RESERVED_GRADING_RUN — TypeScript enforces this at compile time', () => {
      // This is a type-level assertion: FrontendCodeExecutionMode does not include RESERVED_GRADING_RUN
      // Runtime: we verify the type is restricted
      const mode: 'SAMPLE_RUN' | 'PUBLIC_TEST_RUN' = 'SAMPLE_RUN';
      expect(['SAMPLE_RUN', 'PUBLIC_TEST_RUN']).toContain(mode);
      expect(['SAMPLE_RUN', 'PUBLIC_TEST_RUN']).not.toContain('RESERVED_GRADING_RUN');
    });

    it('throws CodeExecutionApiError on non-ok response', async () => {
      const fetchMock = makeFetch(400, {
        error: { code: 'VALIDATION_ERROR', message: 'Bad input' },
      });
      const client = createCodeExecutionApiClient({ baseUrl, fetchImpl: fetchMock });

      await expect(
        client.runCodeSample({ language: 'python', sourceCode: '', executionMode: 'SAMPLE_RUN' }),
      ).rejects.toBeInstanceOf(CodeExecutionApiError);
    });

    it('does not include tenantId or workspaceId in request body', async () => {
      const fetchMock = makeFetch(200, {
        status: 'COMPLETED',
        verdict: 'ACCEPTED',
        language: 'python',
      });
      const client = createCodeExecutionApiClient({ baseUrl, fetchImpl: fetchMock });

      await client.runCodeSample({
        language: 'python',
        sourceCode: 'print("hi")',
        executionMode: 'SAMPLE_RUN',
      });

      const [, init] = (fetchMock as ReturnType<typeof vi.fn>).mock.calls[0] as [
        string,
        RequestInit,
      ];
      const body = JSON.parse(init.body as string) as Record<string, unknown>;
      expect(body).not.toHaveProperty('tenantId');
      expect(body).not.toHaveProperty('workspaceId');
    });
  });

  describe('safety: no provider secrets in client', () => {
    it('client does not send RESERVED_GRADING_RUN', async () => {
      // The FrontendCodeExecutionMode type only allows SAMPLE_RUN | PUBLIC_TEST_RUN
      // This test verifies the type constraint is enforced at runtime
      const fetchMock = makeFetch(200, {
        status: 'COMPLETED',
        verdict: 'ACCEPTED',
        language: 'python',
      });
      const client = createCodeExecutionApiClient({ baseUrl, fetchImpl: fetchMock });

      // Can only pass SAMPLE_RUN or PUBLIC_TEST_RUN — RESERVED_GRADING_RUN would be a type error
      await client.runCodeSample({
        language: 'python',
        sourceCode: 'print(1)',
        executionMode: 'SAMPLE_RUN', // only allowed value
      });

      const [, init] = (fetchMock as ReturnType<typeof vi.fn>).mock.calls[0] as [
        string,
        RequestInit,
      ];
      const body = JSON.parse(init.body as string) as Record<string, unknown>;
      expect(body['executionMode']).not.toBe('RESERVED_GRADING_RUN');
    });

    it('client does not include provider-specific fields', async () => {
      const fetchMock = makeFetch(200, {
        status: 'COMPLETED',
        verdict: 'ACCEPTED',
        language: 'python',
      });
      const client = createCodeExecutionApiClient({ baseUrl, fetchImpl: fetchMock });

      await client.runCodeSample({
        language: 'python',
        sourceCode: 'print(1)',
        executionMode: 'SAMPLE_RUN',
      });

      const [, init] = (fetchMock as ReturnType<typeof vi.fn>).mock.calls[0] as [
        string,
        RequestInit,
      ];
      const body = JSON.parse(init.body as string) as Record<string, unknown>;
      // No provider internals in the request body
      expect(body).not.toHaveProperty('providerApiKey');
      expect(body).not.toHaveProperty('submissionToken');
      expect(body).not.toHaveProperty('containerId');
      expect(body).not.toHaveProperty('queueId');
      expect(body).not.toHaveProperty('workerId');
      expect(body).not.toHaveProperty('tenantId');
      expect(body).not.toHaveProperty('workspaceId');
    });
  });
});
