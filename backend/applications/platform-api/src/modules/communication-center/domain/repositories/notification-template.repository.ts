import type { TransactionContext } from '@mentrily/service-core';
import type {
  NotificationChannel,
  NotificationTemplateStatus,
} from '../value-objects/index.js';
import type { NotificationTemplate } from '../entities/index.js';

export abstract class NotificationTemplateRepository {
  abstract save(template: NotificationTemplate, transaction?: TransactionContext): Promise<NotificationTemplate>;
  abstract findById(id: string, transaction?: TransactionContext): Promise<NotificationTemplate | null>;
  abstract findByWorkspaceKey(
    input: { workspaceId: string; key: string },
    transaction?: TransactionContext,
  ): Promise<NotificationTemplate | null>;
  abstract listByWorkspace(
    input: { workspaceId: string; channel?: NotificationChannel | undefined; status?: NotificationTemplateStatus | undefined },
    transaction?: TransactionContext,
  ): Promise<NotificationTemplate[]>;
}
