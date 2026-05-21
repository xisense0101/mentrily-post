import { buildE2ERequestHeaders } from '@/foundation/e2e/e2e-request-context';
import type {
  AssessmentInstructorResultContract,
  AssessmentLearnerResultContract,
  ReleaseAssessmentResultRequest,
  ReleaseAssessmentResultResponse,
} from '../types';
import { AssessmentResultApiError } from './assessment-result-api-errors';

const PUBLIC_PLATFORM_API_URL =
  process.env.NEXT_PUBLIC_PLATFORM_API_URL ??
  process.env.NEXT_PUBLIC_PLATFORM_API_BASE_URL ??
  '';

interface ErrorEnvelope {
  error?: { code?: string | undefined; message?: string | undefined; requestId?: string | undefined };
}

interface ClientOptions {
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
    return (await response.json()) as T;
  }

  let envelope: ErrorEnvelope | undefined;
  try {
    envelope = (await response.json()) as ErrorEnvelope;
  } catch {
    envelope = undefined;
  }

  throw new AssessmentResultApiError(
    envelope?.error?.message ?? response.statusText ?? 'Assessment result API request failed',
    response.status,
    envelope?.error?.code,
    envelope?.error?.requestId,
  );
}

export function createAssessmentResultApiClient({ baseUrl, envSource, fetchImpl = fetch }: ClientOptions = {}) {
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
    releaseAssessmentResult(attemptId: string, input?: ReleaseAssessmentResultRequest): Promise<ReleaseAssessmentResultResponse> {
      return request(`/workspace/assessment-attempts/${attemptId}/results/release`, {
        method: 'POST',
        ...(input ? { body: JSON.stringify(input) } : {}),
      });
    },
    getLearnerAssessmentResult(attemptId: string): Promise<AssessmentLearnerResultContract> {
      return request(`/workspace/assessment-attempts/${attemptId}/results/me`);
    },
    getInstructorAssessmentResult(attemptId: string): Promise<AssessmentInstructorResultContract> {
      return request(`/workspace/assessment-attempts/${attemptId}/results/instructor`);
    },
  };
}

export const assessmentResultApiClient = createAssessmentResultApiClient();
export const releaseAssessmentResult = assessmentResultApiClient.releaseAssessmentResult.bind(assessmentResultApiClient);
export const getLearnerAssessmentResult = assessmentResultApiClient.getLearnerAssessmentResult.bind(assessmentResultApiClient);
export const getInstructorAssessmentResult = assessmentResultApiClient.getInstructorAssessmentResult.bind(assessmentResultApiClient);
