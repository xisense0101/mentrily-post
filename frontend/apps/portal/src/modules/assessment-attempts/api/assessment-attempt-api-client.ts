import { buildE2ERequestHeaders } from '@/foundation/e2e/e2e-request-context';
import type { MediaReadUrlContract } from '@/contracts/media-library';
import type {
  AssessmentAttemptContract,
  AssessmentAttemptConflictContract,
  AssessmentPublishedSnapshotContract,
  CancelAssessmentAttemptRequest,
  SaveAssessmentAttemptAnswerRequest,
  StartAssessmentAttemptRequest,
  SubmitAssessmentAttemptRequest,
} from '../types';
import { AssessmentAttemptApiError } from './assessment-attempt-api-errors';

const PUBLIC_PLATFORM_API_URL =
  process.env.NEXT_PUBLIC_PLATFORM_API_URL ?? process.env.NEXT_PUBLIC_PLATFORM_API_BASE_URL ?? '';

interface ErrorEnvelope {
  error?: {
    code?: string | undefined;
    message?: string | undefined;
    requestId?: string | undefined;
    details?: AssessmentAttemptConflictContract | undefined;
  };
}

interface AssessmentAttemptApiClientOptions {
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

  throw new AssessmentAttemptApiError(
    envelope?.error?.message ?? response.statusText ?? 'Assessment attempt API request failed',
    response.status,
    envelope?.error?.code,
    envelope?.error?.requestId,
    envelope?.error?.details,
  );
}

export function createAssessmentAttemptApiClient({
  baseUrl,
  envSource,
  fetchImpl = fetch,
}: AssessmentAttemptApiClientOptions = {}) {
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
    startAssessmentAttempt(
      assessmentId: string,
      input?: StartAssessmentAttemptRequest,
    ): Promise<AssessmentAttemptContract> {
      return request<AssessmentAttemptContract>(`/workspace/assessments/${assessmentId}/attempts`, {
        method: 'POST',
        ...(input ? { body: JSON.stringify(input) } : {}),
      });
    },

    listLearnerAssessmentAttempts(): Promise<AssessmentAttemptContract[]> {
      return request<AssessmentAttemptContract[]>('/workspace/assessment-attempts');
    },

    getAssessmentAttempt(attemptId: string): Promise<AssessmentAttemptContract> {
      return request<AssessmentAttemptContract>(`/workspace/assessment-attempts/${attemptId}`);
    },

    getAssessmentAttemptSnapshot(attemptId: string): Promise<AssessmentPublishedSnapshotContract> {
      return request<AssessmentPublishedSnapshotContract>(
        `/workspace/assessment-attempts/${attemptId}/snapshot`,
      );
    },

    saveAssessmentAttemptAnswer(
      attemptId: string,
      questionId: string,
      input: SaveAssessmentAttemptAnswerRequest,
    ): Promise<AssessmentAttemptContract> {
      return request<AssessmentAttemptContract>(
        `/workspace/assessment-attempts/${attemptId}/answers/${questionId}`,
        {
          method: 'PUT',
          body: JSON.stringify(input),
        },
      );
    },

    createAssessmentAttemptAnswerFileReadUrl(
      attemptId: string,
      answerId: string,
      assetId: string,
    ): Promise<MediaReadUrlContract> {
      return request<MediaReadUrlContract>(
        `/workspace/assessment-attempts/${attemptId}/answers/${answerId}/files/${assetId}/read-url`,
        {
          method: 'POST',
          body: JSON.stringify({}),
        },
      );
    },

    submitAssessmentAttempt(
      attemptId: string,
      input?: SubmitAssessmentAttemptRequest,
    ): Promise<AssessmentAttemptContract> {
      return request<AssessmentAttemptContract>(
        `/workspace/assessment-attempts/${attemptId}/submit`,
        {
          method: 'POST',
          ...(input ? { body: JSON.stringify(input) } : {}),
        },
      );
    },

    cancelAssessmentAttempt(
      attemptId: string,
      input?: CancelAssessmentAttemptRequest,
    ): Promise<AssessmentAttemptContract> {
      return request<AssessmentAttemptContract>(
        `/workspace/assessment-attempts/${attemptId}/cancel`,
        {
          method: 'POST',
          ...(input ? { body: JSON.stringify(input) } : {}),
        },
      );
    },
  };
}

export const assessmentAttemptApiClient = createAssessmentAttemptApiClient();

export const startAssessmentAttempt = assessmentAttemptApiClient.startAssessmentAttempt.bind(
  assessmentAttemptApiClient,
);
export const listLearnerAssessmentAttempts =
  assessmentAttemptApiClient.listLearnerAssessmentAttempts.bind(assessmentAttemptApiClient);
export const getAssessmentAttempt = assessmentAttemptApiClient.getAssessmentAttempt.bind(
  assessmentAttemptApiClient,
);
export const getAssessmentAttemptSnapshot =
  assessmentAttemptApiClient.getAssessmentAttemptSnapshot.bind(assessmentAttemptApiClient);
export const saveAssessmentAttemptAnswer =
  assessmentAttemptApiClient.saveAssessmentAttemptAnswer.bind(assessmentAttemptApiClient);
export const createAssessmentAttemptAnswerFileReadUrl =
  assessmentAttemptApiClient.createAssessmentAttemptAnswerFileReadUrl.bind(
    assessmentAttemptApiClient,
  );
export const submitAssessmentAttempt = assessmentAttemptApiClient.submitAssessmentAttempt.bind(
  assessmentAttemptApiClient,
);
export const cancelAssessmentAttempt = assessmentAttemptApiClient.cancelAssessmentAttempt.bind(
  assessmentAttemptApiClient,
);
