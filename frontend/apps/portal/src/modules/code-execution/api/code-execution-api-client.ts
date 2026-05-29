import { buildE2ERequestHeaders } from '@/foundation/e2e/e2e-request-context';
import type {
  CodeExecutionLanguageContract,
  CodeExecutionRequestContract,
  CodeExecutionResultContract,
} from '@/contracts/code-execution';

// ─── Safety rules enforced here ──────────────────────────────────────────────
// • Never sends RESERVED_GRADING_RUN
// • Never sends tenantId / workspaceId in request body
// • Never contains Judge0 / Piston URL, API key, token, queue ID, container ID
// • Never exposes raw provider response — uses normalized CodeExecutionResultContract
// ─────────────────────────────────────────────────────────────────────────────

const PUBLIC_PLATFORM_API_URL =
  process.env.NEXT_PUBLIC_PLATFORM_API_URL ?? process.env.NEXT_PUBLIC_PLATFORM_API_BASE_URL ?? '';

export class CodeExecutionApiError extends Error {
  readonly status: number;
  readonly code?: string | undefined;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'CodeExecutionApiError';
    this.status = status;
    this.code = code;
  }
}

interface ErrorEnvelope {
  error?: {
    code?: string | undefined;
    message?: string | undefined;
  };
}

interface CodeExecutionApiClientOptions {
  baseUrl?: string | undefined;
  envSource?: NodeJS.ProcessEnv | undefined;
  fetchImpl?: typeof fetch | undefined;
}

function resolveApiBaseUrl(baseUrl?: string, envSource?: NodeJS.ProcessEnv): string {
  return (
    baseUrl ??
    envSource?.NEXT_PUBLIC_PLATFORM_API_URL ??
    envSource?.NEXT_PUBLIC_PLATFORM_API_BASE_URL ??
    PUBLIC_PLATFORM_API_URL
  ).replace(/\/$/, '');
}

function withBaseUrl(baseUrl: string, path: string): string {
  return baseUrl ? `${baseUrl}${path}` : path;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    if (response.status === 204) {
      return undefined as T;
    }
    return (await response.json()) as T;
  }

  let envelope: ErrorEnvelope | undefined;
  try {
    envelope = (await response.json()) as ErrorEnvelope;
  } catch {
    envelope = undefined;
  }

  throw new CodeExecutionApiError(
    envelope?.error?.message ?? response.statusText ?? 'Code execution API request failed',
    response.status,
    envelope?.error?.code,
  );
}

/**
 * Frontend-safe execution request.
 * Only SAMPLE_RUN and PUBLIC_TEST_RUN are permitted from the frontend.
 * RESERVED_GRADING_RUN is explicitly excluded from the type.
 */
export type FrontendCodeExecutionMode = 'SAMPLE_RUN' | 'PUBLIC_TEST_RUN';

export interface FrontendCodeExecutionRequest {
  language: string;
  sourceCode: string;
  stdin?: string | null;
  publicTestCases?: Array<{ input: string; expectedOutput?: string }>;
  /** Must be SAMPLE_RUN or PUBLIC_TEST_RUN — RESERVED_GRADING_RUN is rejected by backend */
  executionMode: FrontendCodeExecutionMode;
  attemptId?: string | null;
  questionId?: string | null;
  idempotencyKey?: string | null;
}

export interface GetLanguagesResponse {
  languages: CodeExecutionLanguageContract[];
}

export function createCodeExecutionApiClient({
  baseUrl,
  envSource,
  fetchImpl = fetch,
}: CodeExecutionApiClientOptions = {}) {
  const apiBaseUrl = resolveApiBaseUrl(baseUrl, envSource);

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const e2eHeaders = buildE2ERequestHeaders(undefined, envSource);
    const response = await fetchImpl(withBaseUrl(apiBaseUrl, path), {
      credentials: 'include',
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...(e2eHeaders ?? {}),
        ...(init?.headers ?? {}),
      },
    });

    return parseResponse<T>(response);
  }

  return {
    /**
     * GET /workspace/code-execution/languages
     * Returns the backend-allowed language list. Frontend renders only what the backend allows.
     */
    async getCodeExecutionLanguages(): Promise<CodeExecutionLanguageContract[]> {
      const res = await request<GetLanguagesResponse | CodeExecutionLanguageContract[]>(
        '/workspace/code-execution/languages',
      );
      // backend may return { languages: [...] } or [...] directly
      if (Array.isArray(res)) {
        return res;
      }
      return (res as GetLanguagesResponse).languages ?? [];
    },

    /**
     * POST /workspace/code-execution/sample-run
     * Runs code via the Mentrily backend only.
     * Frontend never calls Judge0/Piston directly.
     * RESERVED_GRADING_RUN is never sent by this method.
     */
    runCodeSample(req: FrontendCodeExecutionRequest): Promise<CodeExecutionResultContract> {
      const safeRequest: CodeExecutionRequestContract = {
        language: req.language,
        sourceCode: req.sourceCode,
        executionMode: req.executionMode,
        ...(req.stdin !== undefined && req.stdin !== null ? { stdin: req.stdin } : {}),
        ...(req.publicTestCases && req.publicTestCases.length > 0
          ? { publicTestCases: req.publicTestCases }
          : {}),
        ...(req.idempotencyKey !== undefined && req.idempotencyKey !== null
          ? { idempotencyKey: req.idempotencyKey }
          : {}),
        ...(req.attemptId !== undefined && req.attemptId !== null
          ? { attemptId: req.attemptId }
          : {}),
        ...(req.questionId !== undefined && req.questionId !== null
          ? { questionId: req.questionId }
          : {}),
      };

      return request<CodeExecutionResultContract>('/workspace/code-execution/sample-run', {
        method: 'POST',
        body: JSON.stringify(safeRequest),
      });
    },
  };
}

export const codeExecutionApiClient = createCodeExecutionApiClient();
