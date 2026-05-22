export type NotificationChannelContract = 'EMAIL' | 'SMS' | 'IN_APP';
export type NotificationIntentStatusContract =
  | 'DRAFT'
  | 'QUEUED'
  | 'DISPATCHED'
  | 'FAILED'
  | 'CANCELLED';
export type NotificationTemplateStatusContract = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
export type NotificationPriorityContract = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type NotificationProviderContract = 'NOOP' | 'FIXTURE' | 'RESERVED_EMAIL' | 'RESERVED_SMS';
export type NotificationInboxStatusContract = 'UNREAD' | 'READ' | 'ARCHIVED';
export type NotificationPreferenceChannelContract = 'IN_APP' | 'EMAIL' | 'SMS';
export type NotificationPreferenceCategoryContract =
  | 'SYSTEM'
  | 'COURSE'
  | 'ASSESSMENT'
  | 'MEDIA'
  | 'BILLING'
  | 'SECURITY'
  | 'ANNOUNCEMENT';

export interface NotificationRecipientContract {
  principalId?: string | undefined;
  email?: string | undefined;
  phoneNumber?: string | undefined;
  displayName?: string | undefined;
}

export interface NotificationTemplateContract {
  id: string;
  key: string;
  name: string;
  description?: string | undefined;
  channel: NotificationChannelContract;
  subjectTemplate?: string | undefined;
  bodyTemplate: string;
  variables: string[];
  status: NotificationTemplateStatusContract;
  metadata: Record<string, unknown>;
  createdByPrincipalId: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | undefined;
}

export interface NotificationIntentContract {
  id: string;
  templateId?: string | undefined;
  channel: NotificationChannelContract;
  recipient: NotificationRecipientContract;
  subject?: string | undefined;
  body: string;
  priority: NotificationPriorityContract;
  status: NotificationIntentStatusContract;
  provider: NotificationProviderContract;
  scheduledFor?: string | undefined;
  queuedAt?: string | undefined;
  dispatchedAt?: string | undefined;
  failedAt?: string | undefined;
  cancelledAt?: string | undefined;
  failureReason?: string | undefined;
  metadata: Record<string, unknown>;
  createdByPrincipalId: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationDeliveryAttemptContract {
  id: string;
  intentId: string;
  provider: NotificationProviderContract;
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED';
  attemptNumber: number;
  providerMessageId?: string | undefined;
  errorCode?: string | undefined;
  errorMessage?: string | undefined;
  createdAt: string;
  completedAt?: string | undefined;
  metadata: Record<string, unknown>;
}

export interface CreateNotificationTemplateRequest {
  key: string;
  name: string;
  description?: string | undefined;
  channel: NotificationChannelContract;
  subjectTemplate?: string | undefined;
  bodyTemplate: string;
  variables?: string[] | undefined;
  activate?: boolean | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export interface RenderNotificationTemplateRequest {
  variables: Record<string, string | number | boolean | null>;
}

export interface RenderNotificationTemplateResponse {
  subject?: string | undefined;
  body: string;
}

export interface CreateNotificationIntentRequest {
  templateId?: string | undefined;
  channel: NotificationChannelContract;
  recipient: NotificationRecipientContract;
  subject?: string | undefined;
  body?: string | undefined;
  variables?: Record<string, string | number | boolean | null> | undefined;
  priority?: NotificationPriorityContract | undefined;
  provider?: NotificationProviderContract | undefined;
  scheduledFor?: string | undefined;
  draft?: boolean | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export interface MarkNotificationIntentDispatchedRequest {
  provider?: NotificationProviderContract | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export interface MarkNotificationIntentFailedRequest {
  failureReason: string;
  provider?: NotificationProviderContract | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export interface ProcessDueNotificationIntentsRequest {
  // Reserved for backend-internal scheduler use. Workspace scope is derived from internal context.
  limit?: number | undefined;
  now?: string | undefined;
}

export interface NotificationSchedulerResultContract {
  intentId: string;
  status: 'DISPATCHED' | 'FAILED' | 'SKIPPED';
  deliveryAttemptId?: string | undefined;
  errorCode?: string | undefined;
  errorMessage?: string | undefined;
}

export interface ProcessDueNotificationIntentsResponse {
  processed: number;
  dispatched: number;
  failed: number;
  skipped: number;
  results: NotificationSchedulerResultContract[];
}

export interface NotificationInboxItemContract {
  id: string;
  channel: NotificationChannelContract;
  recipient: NotificationRecipientContract;
  subject?: string | undefined;
  body: string;
  priority: NotificationPriorityContract;
  status: NotificationInboxStatusContract;
  readAt?: string | undefined;
  archivedAt?: string | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationInboxListQueryContract {
  status?: 'ALL' | 'UNREAD' | 'READ' | 'ARCHIVED' | undefined;
  limit?: number | undefined;
}

export interface NotificationInboxListResponseContract {
  items: NotificationInboxItemContract[];
  unreadCount: number;
}

export interface NotificationUnreadCountResponseContract {
  unreadCount: number;
}

export interface NotificationPreferenceContract {
  id: string;
  channel: NotificationPreferenceChannelContract;
  category: NotificationPreferenceCategoryContract;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPreferencesResponseContract {
  preferences: NotificationPreferenceContract[];
}

export interface UpdateNotificationPreferencesRequestContract {
  channel: NotificationPreferenceChannelContract;
  category: NotificationPreferenceCategoryContract;
  enabled: boolean;
}
