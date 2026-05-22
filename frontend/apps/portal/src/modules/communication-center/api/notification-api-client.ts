import { buildE2ERequestHeaders } from '@/foundation/e2e/e2e-request-context';
import type {
  NotificationInboxItem,
  NotificationInboxListResponse,
  NotificationInboxStatus,
  NotificationPreference,
  NotificationPreferencesResponse,
  NotificationUnreadCountResponse,
  UpdateNotificationPreferencesRequest,
} from '../types';

const PUBLIC_PLATFORM_API_URL =
  process.env.NEXT_PUBLIC_PLATFORM_API_URL ?? process.env.NEXT_PUBLIC_PLATFORM_API_BASE_URL ?? '';

interface ErrorEnvelope {
  error?: {
    code?: string;
    message?: string;
    requestId?: string;
    correlationId?: string;
  };
}

interface NotificationApiClientOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  envSource?: NodeJS.ProcessEnv;
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

  throw new Error(
    envelope?.error?.message ?? response.statusText ?? 'Notification API request failed',
  );
}

export function createNotificationApiClient({
  baseUrl,
  fetchImpl = fetch,
  envSource,
}: NotificationApiClientOptions = {}) {
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
    listNotifications(input?: {
      status?: Exclude<NotificationInboxStatus, never> | 'ALL';
      limit?: number;
    }): Promise<NotificationInboxListResponse> {
      const params = new URLSearchParams();
      if (input?.status) {
        params.set('status', input.status);
      }
      if (typeof input?.limit === 'number') {
        params.set('limit', String(input.limit));
      }
      const suffix = params.size > 0 ? `?${params.toString()}` : '';
      return request<NotificationInboxListResponse>(
        `/workspace/communication/notifications${suffix}`,
      );
    },
    getUnreadCount(): Promise<NotificationUnreadCountResponse> {
      return request<NotificationUnreadCountResponse>(
        '/workspace/communication/notifications/unread-count',
      );
    },
    markNotificationRead(notificationId: string): Promise<NotificationInboxItem> {
      return request<NotificationInboxItem>(
        `/workspace/communication/notifications/${notificationId}/mark-read`,
        {
          method: 'POST',
        },
      );
    },
    markNotificationUnread(notificationId: string): Promise<NotificationInboxItem> {
      return request<NotificationInboxItem>(
        `/workspace/communication/notifications/${notificationId}/mark-unread`,
        {
          method: 'POST',
        },
      );
    },
    archiveNotification(notificationId: string): Promise<NotificationInboxItem> {
      return request<NotificationInboxItem>(
        `/workspace/communication/notifications/${notificationId}/mark-archived`,
        {
          method: 'POST',
        },
      );
    },
    getPreferences(): Promise<NotificationPreferencesResponse> {
      return request<NotificationPreferencesResponse>('/workspace/communication/preferences');
    },
    updatePreference(input: UpdateNotificationPreferencesRequest): Promise<NotificationPreference> {
      return request<NotificationPreference>('/workspace/communication/preferences', {
        method: 'PUT',
        body: JSON.stringify(input),
      });
    },
  };
}

export const notificationApiClient = createNotificationApiClient();

export const {
  archiveNotification,
  getPreferences,
  getUnreadCount,
  listNotifications,
  markNotificationRead,
  markNotificationUnread,
  updatePreference,
} = notificationApiClient;
