import { describe, expect, it } from 'vitest';
import { NotificationTemplate } from '../domain/entities/index.js';

describe('NotificationTemplate', () => {
  it('creates a draft template and activates it', () => {
    const draft = NotificationTemplate.createDraft({
      id: '11111111-1111-4111-8111-111111111111',
      tenantId: '22222222-2222-4222-8222-222222222222',
      workspaceId: '33333333-3333-4333-8333-333333333333',
      key: 'welcome_email',
      name: 'Welcome Email',
      channel: 'EMAIL',
      subjectTemplate: 'Hi {{name}}',
      bodyTemplate: 'Welcome {{name}}',
      variables: ['name'],
      createdByPrincipalId: '44444444-4444-4444-8444-444444444444',
    });
    expect(draft.status).toBe('DRAFT');
    expect(draft.activate().status).toBe('ACTIVE');
  });

  it('rejects invalid variable names', () => {
    expect(() => NotificationTemplate.createDraft({
      id: '11111111-1111-4111-8111-111111111111',
      tenantId: '22222222-2222-4222-8222-222222222222',
      workspaceId: '33333333-3333-4333-8333-333333333333',
      key: 'bad',
      name: 'Bad',
      channel: 'SMS',
      bodyTemplate: 'Hi {{1bad}}',
      variables: ['1bad'],
      createdByPrincipalId: '44444444-4444-4444-8444-444444444444',
    })).toThrow(/invalid template variable/);
  });
});
