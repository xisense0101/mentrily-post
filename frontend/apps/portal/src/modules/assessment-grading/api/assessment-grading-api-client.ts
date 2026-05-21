import { buildE2ERequestHeaders } from '@/foundation/e2e/e2e-request-context';
import type {
  AssessmentGradingRunContract,
  AssessmentManualReviewItemContract,
  GradeAssessmentAttemptRequest,
  ManualGradeAssessmentAnswerRequest,
} from '../types';
import { AssessmentGradingApiError } from './assessment-grading-api-errors';

const PUBLIC_PLATFORM_API_URL =
  process.env.NEXT_PUBLIC_PLATFORM_API_URL ?? process.env.NEXT_PUBLIC_PLATFORM_API_BASE_URL ?? '';

interface ErrorEnvelope {
  error?: { code?: string; message?: string; requestId?: string };
}

interface AssessmentManualReviewQueueResponse {
  items: AssessmentManualReviewItemContract[];
}

interface ClientOptions {
  baseUrl?: string;
  envSource?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
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

  throw new AssessmentGradingApiError(
    envelope?.error?.message ?? response.statusText ?? 'Assessment grading API request failed',
    response.status,
    envelope?.error?.code,
    envelope?.error?.requestId,
  );
}

export function createAssessmentGradingApiClient({
  baseUrl,
  envSource,
  fetchImpl = fetch,
}: ClientOptions = {}) {
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
    gradeAssessmentAttempt(
      attemptId: string,
      input?: GradeAssessmentAttemptRequest,
    ): Promise<AssessmentGradingRunContract> {
      return request(`/workspace/assessment-attempts/${attemptId}/grade`, {
        method: 'POST',
        ...(input ? { body: JSON.stringify(input) } : {}),
      });
    },

    getLatestAssessmentGradingRun(attemptId: string): Promise<AssessmentGradingRunContract> {
      return request(`/workspace/assessment-attempts/${attemptId}/grading/latest`);
    },

    getAssessmentGradingRun(gradingRunId: string): Promise<AssessmentGradingRunContract> {
      return request(`/workspace/assessment-grading-runs/${gradingRunId}`);
    },

    async listPendingManualReview(): Promise<AssessmentManualReviewItemContract[]> {
      const response = await request<AssessmentManualReviewQueueResponse>(
        '/workspace/assessment-grading/manual-review',
      );
      return response.items;
    },

    manualGradeAssessmentAnswer(
      gradingRunId: string,
      answerId: string,
      input: ManualGradeAssessmentAnswerRequest,
    ): Promise<AssessmentGradingRunContract> {
      return request(
        `/workspace/assessment-grading-runs/${gradingRunId}/answers/${answerId}/manual-grade`,
        {
          method: 'POST',
          body: JSON.stringify(input),
        },
      );
    },
  };
}

export const assessmentGradingApiClient = createAssessmentGradingApiClient();
