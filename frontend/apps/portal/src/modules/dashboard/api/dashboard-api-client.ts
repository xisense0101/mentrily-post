import { buildE2ERequestHeaders } from '@/foundation/e2e/e2e-request-context';
import type {
  DashboardActivityItemContract,
  DashboardSummaryContract,
  MultiWorkspaceDashboardSummaryContract,
} from '@mentrily/domain-contracts';

const PUBLIC_PLATFORM_API_URL =
  process.env.NEXT_PUBLIC_PLATFORM_API_URL ?? process.env.NEXT_PUBLIC_PLATFORM_API_BASE_URL ?? '';

interface ErrorEnvelope {
  error?: {
    message?: string;
  };
}

interface DashboardSummaryResponse {
  summary: DashboardSummaryContract;
  recentActivity: DashboardActivityItemContract[];
}

interface DashboardApiClientOptions {
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

  throw new Error(
    envelope?.error?.message ?? response.statusText ?? 'Dashboard API request failed',
  );
}

export function createDashboardApiClient({
  baseUrl,
  envSource,
  fetchImpl = fetch,
}: DashboardApiClientOptions = {}) {
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
    getDashboardSummary(): Promise<DashboardSummaryResponse> {
      return request<DashboardSummaryResponse>('/workspace/dashboard');
    },
    getMultiWorkspaceDashboard(): Promise<MultiWorkspaceDashboardSummaryContract> {
      return request<MultiWorkspaceDashboardSummaryContract>('/workspace/dashboard/multi');
    },
  };
}

export const dashboardApiClient = createDashboardApiClient();
