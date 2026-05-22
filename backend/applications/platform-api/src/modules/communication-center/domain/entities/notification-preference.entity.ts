import { AppError } from '@mentrily/service-core';
import type {
  NotificationPreferenceCategoryContract,
  NotificationPreferenceChannelContract,
} from '@mentrily/contract-catalog';

export interface NotificationPreferenceProps {
  id: string;
  tenantId: string;
  workspaceId: string;
  userId: string;
  channel: NotificationPreferenceChannelContract;
  category: NotificationPreferenceCategoryContract;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function required<T extends string>(value: T, field: string): T {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new AppError('VALIDATION_ERROR', `${field} is required`, 400);
  }
  return trimmed as T;
}

export class NotificationPreference {
  readonly id: string;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly userId: string;
  readonly channel: NotificationPreferenceChannelContract;
  readonly category: NotificationPreferenceCategoryContract;
  readonly enabled: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: NotificationPreferenceProps) {
    this.id = required(props.id, 'id');
    this.tenantId = required(props.tenantId, 'tenantId');
    this.workspaceId = required(props.workspaceId, 'workspaceId');
    this.userId = required(props.userId, 'userId');
    this.channel = required(props.channel, 'channel');
    this.category = required(props.category, 'category');
    this.enabled = props.enabled;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}
