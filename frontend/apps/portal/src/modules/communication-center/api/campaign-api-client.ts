import { buildE2ERequestHeaders } from '@/foundation/e2e/e2e-request-context';
import type {
  CampaignContract,
  CreateCampaignRequestContract,
  UpdateCampaignRequestContract,
  ScheduleCampaignRequestContract,
  CampaignAudiencePreviewRequestContract,
  CampaignMessagePreviewRequestContract,
  CampaignAudiencePreviewResponseContract,
  CampaignMessagePreviewResponseContract,
} from '@mentrily/domain-contracts';

const PUBLIC_PLATFORM_API_URL =
  process.env.NEXT_PUBLIC_PLATFORM_API_URL ?? process.env.NEXT_PUBLIC_PLATFORM_API_BASE_URL ?? '';

interface ErrorEnvelope {
  error?: {
    code?: string;
    message?: string;
    requestId?: string;
  };
}

interface CampaignApiClientOptions {
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
  throw new Error(envelope?.error?.message ?? response.statusText ?? 'Campaign API request failed');
}

export function createCampaignApiClient({
  baseUrl,
  envSource,
  fetchImpl = fetch,
}: CampaignApiClientOptions = {}) {
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
    listCampaigns(): Promise<CampaignContract[]> {
      return request<CampaignContract[]>('/workspace/communication/campaigns');
    },
    listTemplates(): Promise<any[]> {
      return request<any[]>('/workspace/communication/templates');
    },
    getCampaign(campaignId: string): Promise<CampaignContract> {
      return request<CampaignContract>(`/workspace/communication/campaigns/${campaignId}`);
    },
    createCampaign(input: CreateCampaignRequestContract): Promise<CampaignContract> {
      return request<CampaignContract>('/workspace/communication/campaigns', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
    updateCampaign(
      campaignId: string,
      input: UpdateCampaignRequestContract,
    ): Promise<CampaignContract> {
      return request<CampaignContract>(`/workspace/communication/campaigns/${campaignId}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      });
    },
    archiveCampaign(campaignId: string): Promise<CampaignContract> {
      return request<CampaignContract>(`/workspace/communication/campaigns/${campaignId}`, {
        method: 'DELETE',
      });
    },
    scheduleCampaign(
      campaignId: string,
      input: ScheduleCampaignRequestContract,
    ): Promise<CampaignContract> {
      return request<CampaignContract>(
        `/workspace/communication/campaigns/${campaignId}/schedule`,
        {
          method: 'POST',
          body: JSON.stringify(input),
        },
      );
    },
    previewAudience(
      input: CampaignAudiencePreviewRequestContract,
    ): Promise<CampaignAudiencePreviewResponseContract> {
      return request<CampaignAudiencePreviewResponseContract>(
        '/workspace/communication/campaigns/preview-audience',
        {
          method: 'POST',
          body: JSON.stringify(input),
        },
      );
    },
    previewMessage(
      input: CampaignMessagePreviewRequestContract,
    ): Promise<CampaignMessagePreviewResponseContract> {
      return request<CampaignMessagePreviewResponseContract>(
        '/workspace/communication/campaigns/preview-message',
        {
          method: 'POST',
          body: JSON.stringify(input),
        },
      );
    },
  };
}

export const campaignApiClient = createCampaignApiClient();
