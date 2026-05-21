import { describe, expect, it, vi } from 'vitest';
import { CreateNotificationIntentUseCase } from '../application/use-cases/index.js';
import {
  NotificationIntentPolicyService,
  NotificationRecipientPolicyService,
  NotificationTemplatePolicyService,
} from '../domain/services/index.js';
import { NotificationTemplateRendererService } from '../application/services/index.js';
import { getSafeNotificationProviderConfig } from '../application/support/index.js';

describe('CreateNotificationIntentUseCase', () => {
  it('creates intent from direct body and does not call provider', async () => {
    const saved = vi.fn(async (intent) => intent);
    const useCase = new CreateNotificationIntentUseCase(
      { save: saved, findById: vi.fn(), listByWorkspace: vi.fn() } as never,
      { findById: vi.fn(async () => null), findByWorkspaceKey: vi.fn(), save: vi.fn(), listByWorkspace: vi.fn() } as never,
      { evaluate: vi.fn(async () => ({ allowed: true })) },
      { run: vi.fn(async (operation) => operation({ transactionId: 'tx', client: {} })) },
      { record: vi.fn() },
      new NotificationTemplatePolicyService(),
      new NotificationIntentPolicyService(),
      new NotificationRecipientPolicyService(),
      new NotificationTemplateRendererService(),
      { publishDomainEvent: vi.fn() } as never,
      getSafeNotificationProviderConfig(),
    );
    const result = await useCase.execute({
      requestId: 'r',
      correlationId: 'c',
      workspace: { tenantId: 't', workspaceId: 'w', actorId: 'a' },
    }, {
      channel: 'SMS',
      recipient: { phoneNumber: '+123456789' },
      body: 'Hello',
    });
    expect(result.status).toBe('QUEUED');
    expect(saved).toHaveBeenCalledTimes(1);
  });
});
