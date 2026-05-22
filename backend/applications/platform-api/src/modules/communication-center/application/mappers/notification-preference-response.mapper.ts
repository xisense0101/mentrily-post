import type { NotificationPreference } from '../../domain/entities/index.js';
import type { NotificationPreferenceResponse } from '../dto/index.js';

export function mapNotificationPreferenceToResponse(
  pref: NotificationPreference,
): NotificationPreferenceResponse {
  return {
    id: pref.id,
    channel: pref.channel,
    category: pref.category,
    enabled: pref.enabled,
    createdAt: pref.createdAt.toISOString(),
    updatedAt: pref.updatedAt.toISOString(),
  };
}
