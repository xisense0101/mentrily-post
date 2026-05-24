import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CommunicationProviderTransport } from '../infrastructure/delivery/communication-provider.transport.js';
import { ReservedPushNotificationDeliveryProvider } from '../infrastructure/delivery/reserved-push-notification-delivery.provider.js';

describe('CommunicationProviderTransport & Push Provider tests', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    mockFetch.mockReset();
  });

  describe('Resend/Email live gating and error sanitization', () => {
    it('fails closed when allowLiveDelivery is false', async () => {
      const config = {
        defaultProvider: 'RESERVED_EMAIL' as const,
        emailProvider: 'RESEND_RESERVED' as const,
        featureFlags: {
          emailProviderEnabled: true,
          smsProviderEnabled: false,
          pushProviderEnabled: false,
          allowLiveDelivery: false,
        },
        resendApiKey: 're_123',
        resendFromEmail: 'sender@example.com',
      };
      const transport = new CommunicationProviderTransport(config);
      const result = await transport.send({
        provider: 'RESERVED_EMAIL',
        channel: 'EMAIL',
        payload: { to: 'recipient@example.com', subject: 'Hello', bodyText: 'World' },
      });
      expect(result.ok).toBe(false);
      expect(result.errorCode).toBe('PROVIDER_DISABLED');
      expect(result.errorMessage).toContain('disabled or missing configuration');
    });

    it('fails closed when missing API Key or From email', async () => {
      const config = {
        defaultProvider: 'RESERVED_EMAIL' as const,
        emailProvider: 'RESEND_RESERVED' as const,
        featureFlags: {
          emailProviderEnabled: true,
          smsProviderEnabled: false,
          pushProviderEnabled: false,
          allowLiveDelivery: true,
        },
        resendApiKey: '',
        resendFromEmail: 'sender@example.com',
      };
      const transport = new CommunicationProviderTransport(config);
      const result = await transport.send({
        provider: 'RESERVED_EMAIL',
        channel: 'EMAIL',
        payload: { to: 'recipient@example.com', subject: 'Hello', bodyText: 'World' },
      });
      expect(result.ok).toBe(false);
      expect(result.errorCode).toBe('PROVIDER_DISABLED');
    });

    it('sanitizes Resend validation errors and does not store/expose raw responses', async () => {
      const config = {
        defaultProvider: 'RESERVED_EMAIL' as const,
        emailProvider: 'RESEND_RESERVED' as const,
        featureFlags: {
          emailProviderEnabled: true,
          smsProviderEnabled: false,
          pushProviderEnabled: false,
          allowLiveDelivery: true,
        },
        resendApiKey: 're_123',
        resendFromEmail: 'sender@example.com',
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () =>
          JSON.stringify({
            name: 'validation_error',
            message: 'The email address is invalid',
          }),
      });

      const transport = new CommunicationProviderTransport(config);
      const result = await transport.send({
        provider: 'RESERVED_EMAIL',
        channel: 'EMAIL',
        payload: { to: 'recipient@example.com', subject: 'Hello', bodyText: 'World' },
      });

      expect(result.ok).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
      expect(result.errorMessage).toBe('Provider validation failed.');
      // Ensure raw response text was not returned
      expect(result.errorMessage).not.toContain('The email address is invalid');
    });

    it('sanitizes Resend auth errors', async () => {
      const config = {
        defaultProvider: 'RESERVED_EMAIL' as const,
        emailProvider: 'RESEND_RESERVED' as const,
        featureFlags: {
          emailProviderEnabled: true,
          smsProviderEnabled: false,
          pushProviderEnabled: false,
          allowLiveDelivery: true,
        },
        resendApiKey: 're_123',
        resendFromEmail: 'sender@example.com',
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      const transport = new CommunicationProviderTransport(config);
      const result = await transport.send({
        provider: 'RESERVED_EMAIL',
        channel: 'EMAIL',
        payload: { to: 'recipient@example.com', subject: 'Hello', bodyText: 'World' },
      });

      expect(result.ok).toBe(false);
      expect(result.errorCode).toBe('AUTHENTICATION_ERROR');
      expect(result.errorMessage).toBe('Provider authentication failed.');
    });
  });

  describe('Twilio/SMS live gating and error sanitization', () => {
    it('fails closed when missing account SID or token', async () => {
      const config = {
        defaultProvider: 'RESERVED_SMS' as const,
        smsProvider: 'TWILIO_RESERVED' as const,
        featureFlags: {
          emailProviderEnabled: false,
          smsProviderEnabled: true,
          pushProviderEnabled: false,
          allowLiveDelivery: true,
        },
        twilioAccountSid: '',
        twilioAuthToken: 'token_123',
        twilioFromNumber: '+15555550100',
      };
      const transport = new CommunicationProviderTransport(config);
      const result = await transport.send({
        provider: 'RESERVED_SMS',
        channel: 'SMS',
        payload: { to: '+15555559999', body: 'Test message' },
      });
      expect(result.ok).toBe(false);
      expect(result.errorCode).toBe('PROVIDER_DISABLED');
    });

    it('sanitizes Twilio unverified numbers containing recipient PII', async () => {
      const config = {
        defaultProvider: 'RESERVED_SMS' as const,
        smsProvider: 'TWILIO_RESERVED' as const,
        featureFlags: {
          emailProviderEnabled: false,
          smsProviderEnabled: true,
          pushProviderEnabled: false,
          allowLiveDelivery: true,
        },
        twilioAccountSid: 'AC123',
        twilioAuthToken: 'token_123',
        twilioFromNumber: '+15555550100',
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () =>
          JSON.stringify({
            code: 21608,
            message: 'The number +15555559999 is unverified in sandbox.',
          }),
      });

      const transport = new CommunicationProviderTransport(config);
      const result = await transport.send({
        provider: 'RESERVED_SMS',
        channel: 'SMS',
        payload: { to: '+15555559999', body: 'Test message' },
      });

      expect(result.ok).toBe(false);
      expect(result.errorCode).toBe('TWILIO_UNVERIFIED_NUMBER');
      expect(result.errorMessage).toBe('Destination number is unverified in sandbox.');
      // Confirm PII/raw response was sanitized
      expect(result.errorMessage).not.toContain('+15555559999');
    });
  });

  describe('ReservedPushNotificationDeliveryProvider behavior', () => {
    it('fails closed when disabled by configuration', async () => {
      const config = {
        defaultProvider: 'RESERVED_PUSH' as const,
        featureFlags: {
          emailProviderEnabled: false,
          smsProviderEnabled: false,
          pushProviderEnabled: false,
          allowLiveDelivery: true,
        },
      };

      const provider = new ReservedPushNotificationDeliveryProvider(config, false);
      const result = await provider.deliver({
        intentId: 'intent-1',
        channel: 'IN_APP',
        recipient: { principalId: 'user-1' },
        body: 'Push payload',
        metadata: {},
      });

      expect(result.status).toBe('FAILED');
      expect(result.errorCode).toBe('PROVIDER_DISABLED');
      expect(result.errorMessage).toContain('Push provider delivery is disabled');
    });

    it('requires a principalId recipient', async () => {
      const config = {
        defaultProvider: 'RESERVED_PUSH' as const,
        featureFlags: {
          emailProviderEnabled: false,
          smsProviderEnabled: false,
          pushProviderEnabled: true,
          allowLiveDelivery: true,
        },
      };

      const provider = new ReservedPushNotificationDeliveryProvider(config, false);
      await expect(
        provider.deliver({
          intentId: 'intent-1',
          channel: 'IN_APP',
          recipient: {}, // missing principalId
          body: 'Push payload',
          metadata: {},
        }),
      ).rejects.toThrow(/requires a valid principalId/i);
    });
  });
});
