import { describe, expect, it } from 'vitest';
import { communicationIntentCreated, communicationTemplateCreated } from '../domain/events/index.js';

describe('Communication events', () => {
  it('includes tenant and workspace in payload envelopes', () => {
    const templateEvent = communicationTemplateCreated({
      tenantId: 'tenant',
      workspaceId: 'workspace',
      templateId: 'template',
      key: 'key',
      channel: 'EMAIL',
      status: 'DRAFT',
    });
    const intentEvent = communicationIntentCreated({
      tenantId: 'tenant',
      workspaceId: 'workspace',
      intentId: 'intent',
      channel: 'SMS',
      status: 'QUEUED',
      provider: 'NOOP',
    });
    expect(templateEvent.tenantId).toBe('tenant');
    expect(intentEvent.workspaceId).toBe('workspace');
  });
});
