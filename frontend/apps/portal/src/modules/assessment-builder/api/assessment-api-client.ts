import { buildE2ERequestHeaders } from '@/foundation/e2e/e2e-request-context';
import type {
  AssessmentContract,
  AssessmentPublishedSnapshotContract,
  AssessmentPurposeContract,
  CreateAssessmentRequest,
  PublishAssessmentRequest,
  ReplaceAssessmentContentRequest,
  RestoreAssessmentRequest,
  UpdateAssessmentRequest,
} from '../types';
import type { CodingAssessmentAnalyticsContract } from '@mentrily/domain-contracts';
import { AssessmentApiError } from './assessment-api-errors';

const PUBLIC_PLATFORM_API_URL =
  process.env.NEXT_PUBLIC_PLATFORM_API_URL ?? process.env.NEXT_PUBLIC_PLATFORM_API_BASE_URL ?? '';

interface ErrorEnvelope {
  error?: {
    code?: string | undefined;
    message?: string | undefined;
    requestId?: string | undefined;
  };
}

interface AssessmentApiClientOptions {
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
  if (!baseUrl) {
    return path;
  }

  return `${baseUrl}${path}`;
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

  throw new AssessmentApiError(
    envelope?.error?.message ?? response.statusText ?? 'Assessment API request failed',
    response.status,
    envelope?.error?.code,
    envelope?.error?.requestId,
  );
}

export function createAssessmentApiClient({
  baseUrl,
  envSource,
  fetchImpl = fetch,
}: AssessmentApiClientOptions = {}) {
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
    listAssessments(input?: {
      purpose?: AssessmentPurposeContract | undefined;
    }): Promise<AssessmentContract[]> {
      const searchParams = new URLSearchParams();
      if (input?.purpose) {
        searchParams.set('purpose', input.purpose);
      }
      const query = searchParams.toString();

      return request<AssessmentContract[]>(`/workspace/assessments${query ? `?${query}` : ''}`);
    },

    getAssessment(assessmentId: string): Promise<AssessmentContract> {
      return request<AssessmentContract>(`/workspace/assessments/${assessmentId}`);
    },

    createAssessment(input: CreateAssessmentRequest): Promise<AssessmentContract> {
      return request<AssessmentContract>('/workspace/assessments', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },

    updateAssessment(
      assessmentId: string,
      input: UpdateAssessmentRequest,
    ): Promise<AssessmentContract> {
      return request<AssessmentContract>(`/workspace/assessments/${assessmentId}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      });
    },

    replaceAssessmentContent(
      assessmentId: string,
      input: ReplaceAssessmentContentRequest,
    ): Promise<AssessmentContract> {
      return request<AssessmentContract>(`/workspace/assessments/${assessmentId}/content`, {
        method: 'PUT',
        body: JSON.stringify(input),
      });
    },

    publishAssessment(
      assessmentId: string,
      input: PublishAssessmentRequest = {},
    ): Promise<AssessmentContract> {
      return request<AssessmentContract>(`/workspace/assessments/${assessmentId}/publish`, {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },

    archiveAssessment(assessmentId: string): Promise<AssessmentContract> {
      return request<AssessmentContract>(`/workspace/assessments/${assessmentId}/archive`, {
        method: 'POST',
      });
    },

    restoreAssessment(
      assessmentId: string,
      input: RestoreAssessmentRequest = {},
    ): Promise<AssessmentContract> {
      return request<AssessmentContract>(`/workspace/assessments/${assessmentId}/restore`, {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },

    getLatestAssessmentSnapshot(
      assessmentId: string,
    ): Promise<AssessmentPublishedSnapshotContract> {
      return request<AssessmentPublishedSnapshotContract>(
        `/workspace/assessments/${assessmentId}/snapshots/latest`,
      );
    },

    getCodingAssessmentAnalytics(assessmentId: string): Promise<CodingAssessmentAnalyticsContract> {
      return request<CodingAssessmentAnalyticsContract>(
        `/workspace/assessments/${assessmentId}/analytics/coding`,
      );
    },
  };
}

export const assessmentApiClient = createAssessmentApiClient();

export const listAssessments = assessmentApiClient.listAssessments.bind(assessmentApiClient);
export const getAssessment = assessmentApiClient.getAssessment.bind(assessmentApiClient);
export const createAssessment = assessmentApiClient.createAssessment.bind(assessmentApiClient);
export const updateAssessment = assessmentApiClient.updateAssessment.bind(assessmentApiClient);
export const replaceAssessmentContent =
  assessmentApiClient.replaceAssessmentContent.bind(assessmentApiClient);
export const publishAssessment = assessmentApiClient.publishAssessment.bind(assessmentApiClient);
export const archiveAssessment = assessmentApiClient.archiveAssessment.bind(assessmentApiClient);
export const restoreAssessment = assessmentApiClient.restoreAssessment.bind(assessmentApiClient);
export const getLatestAssessmentSnapshot =
  assessmentApiClient.getLatestAssessmentSnapshot.bind(assessmentApiClient);
export const getCodingAssessmentAnalytics =
  assessmentApiClient.getCodingAssessmentAnalytics.bind(assessmentApiClient);
