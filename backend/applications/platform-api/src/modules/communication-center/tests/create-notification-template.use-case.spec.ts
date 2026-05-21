import { describe, expect, it, vi } from 'vitest';
import { CreateNotificationTemplateUseCase } from '../application/use-cases/index.js';
import { NotificationTemplatePolicyService } from '../domain/services/index.js';

describe('CreateNotificationTemplateUseCase', () => {
  it('fails without workspace context and rejects duplicate keys', async () => {
    const useCase = new CreateNotificationTemplateUseCase(
      { save: vi.fn(), findByWorkspaceKey: vi.fn(async () => ({})), findById: vi.fn(), listByWorkspace: vi.fn() } as never,
      { evaluate: vi.fn(async () => ({ allowed: true })) },
      { run: vi.fn(async (operation) => operation({ transactionId: 'tx', client: {} })) },
      { record: vi.fn() },
      new NotificationTemplatePolicyService(),
      { publishDomainEvent: vi.fn() } as never,
    );
    await expect(useCase.execute({ requestId: 'r', correlationId: 'c' }, {
      key: 'key',
      name: 'Name',
      channel: 'SMS',
      bodyTemplate: 'Body',
    })).rejects.toThrow(/missing workspace context/);
  });
});
