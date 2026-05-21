import { describe, expect, it } from 'vitest';
import {
  NotificationIntentPolicyService,
  NotificationRecipientPolicyService,
  NotificationTemplatePolicyService,
} from '../domain/services/index.js';
import { NotificationTemplate } from '../domain/entities/index.js';

describe('Communication policies', () => {
  it('enforces email template subject and archived template restrictions', () => {
    const templatePolicy = new NotificationTemplatePolicyService();
    expect(() => templatePolicy.validateCreate({
      channel: 'EMAIL',
      bodyTemplate: 'Body',
      variables: [],
    })).toThrow(/subjectTemplate/);

    const archived = NotificationTemplate.createDraft({
      id: '11111111-1111-4111-8111-111111111111',
      tenantId: '22222222-2222-4222-8222-222222222222',
      workspaceId: '33333333-3333-4333-8333-333333333333',
      key: 'archive_me',
      name: 'Archive Me',
      channel: 'SMS',
      bodyTemplate: 'Body',
      variables: [],
      createdByPrincipalId: '44444444-4444-4444-8444-444444444444',
    }).archive();
    expect(() => templatePolicy.assertCanRenderForIntent(archived)).toThrow(/not active/);
  });

  it('enforces recipient and sms body rules', () => {
    const recipientPolicy = new NotificationRecipientPolicyService();
    const intentPolicy = new NotificationIntentPolicyService();
    expect(() => recipientPolicy.validate('SMS', {})).toThrow(/recipient is required/);
    expect(() => intentPolicy.validateCreate({
      channel: 'SMS',
      body: 'x'.repeat(1601),
    })).toThrow(/length limit/);
  });
});
