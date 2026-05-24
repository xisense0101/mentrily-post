import { Inject, Injectable } from '@nestjs/common';
import {
  NOTIFICATION_PROVIDER_CONFIG,
  type NotificationProviderConfig,
} from '../../application/support/index.js';
import type {
  NotificationProviderTransport,
  NotificationProviderTransportResult,
} from './reserved-email-notification-delivery.provider.js';

@Injectable()
export class CommunicationProviderTransport implements NotificationProviderTransport {
  constructor(
    @Inject(NOTIFICATION_PROVIDER_CONFIG)
    private readonly config: NotificationProviderConfig,
  ) {}

  async send(input: {
    provider: 'RESERVED_EMAIL' | 'RESERVED_SMS';
    channel: 'EMAIL' | 'SMS';
    payload: Record<string, unknown>;
  }): Promise<NotificationProviderTransportResult> {
    if (input.channel === 'EMAIL') {
      return this.sendEmail(input.payload);
    } else {
      return this.sendSms(input.payload);
    }
  }

  private parseJsonResponse(text: string): Record<string, unknown> {
    try {
      if (text) {
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed === 'object') {
          return parsed as Record<string, unknown>;
        }
      }
    } catch {
      // Ignore parsing errors
    }
    return {};
  }

  private async sendEmail(
    payload: Record<string, unknown>,
  ): Promise<NotificationProviderTransportResult> {
    const isLiveAllowed = this.config.featureFlags.allowLiveDelivery;
    const emailProvider = this.config.emailProvider;
    const apiKey = this.config.resendApiKey;
    const fromEmail = this.config.resendFromEmail;

    if (
      !isLiveAllowed ||
      emailProvider !== 'RESEND_RESERVED' ||
      !apiKey ||
      !apiKey.trim() ||
      !fromEmail ||
      !fromEmail.trim()
    ) {
      return {
        ok: false,
        errorCode: 'PROVIDER_DISABLED',
        errorMessage: 'Resend live delivery is disabled or missing configuration.',
        metadata: { retryable: false },
      };
    }

    const to = payload.to;
    if (!to || typeof to !== 'string' || !to.includes('@')) {
      return {
        ok: false,
        errorCode: 'VALIDATION_ERROR',
        errorMessage: 'Invalid or missing recipient email address.',
        metadata: { retryable: false },
      };
    }

    const replyTo = this.config.resendReplyToEmail || 'support@mentrily.com';

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to,
          subject: payload.subject,
          text: payload.bodyText,
          html: payload.bodyHtml || undefined,
          reply_to: replyTo,
        }),
      });

      const responseText = await response.text();
      const data = this.parseJsonResponse(responseText);

      if (!response.ok) {
        const isRetryable = response.status === 429 || response.status >= 500;
        let errorCode = 'PROVIDER_ERROR';
        let errorMessage = 'External provider returned an error.';

        if (response.status === 401 || response.status === 403) {
          errorCode = 'AUTHENTICATION_ERROR';
          errorMessage = 'Provider authentication failed.';
        } else if (response.status === 429) {
          errorCode = 'RATE_LIMIT_EXCEEDED';
          errorMessage = 'Rate limit exceeded by provider.';
        } else if (typeof data.name === 'string' && data.name === 'validation_error') {
          errorCode = 'VALIDATION_ERROR';
          errorMessage = 'Provider validation failed.';
        }

        return {
          ok: false,
          errorCode,
          errorMessage,
          metadata: { status: response.status, retryable: isRetryable },
        };
      }

      const resendId = typeof data.id === 'string' ? data.id : undefined;

      return {
        ok: true,
        providerMessageId: resendId,
        metadata: { resendId },
      };
    } catch {
      return {
        ok: false,
        errorCode: 'NETWORK_ERROR',
        errorMessage: 'Network error occurred during email delivery.',
        metadata: { retryable: true },
      };
    }
  }

  private async sendSms(
    payload: Record<string, unknown>,
  ): Promise<NotificationProviderTransportResult> {
    const isLiveAllowed = this.config.featureFlags.allowLiveDelivery;
    const smsProvider = this.config.smsProvider;
    const accountSid = this.config.twilioAccountSid;
    const authToken = this.config.twilioAuthToken;
    const from = this.config.twilioFromNumber;
    const messagingServiceSid = this.config.twilioMessagingServiceSid;

    if (
      !isLiveAllowed ||
      smsProvider !== 'TWILIO_RESERVED' ||
      !accountSid ||
      !accountSid.trim() ||
      !authToken ||
      !authToken.trim() ||
      (!from && !messagingServiceSid)
    ) {
      return {
        ok: false,
        errorCode: 'PROVIDER_DISABLED',
        errorMessage: 'Twilio live delivery is disabled or missing configuration.',
        metadata: { retryable: false },
      };
    }

    const to = payload.to;
    if (!to || typeof to !== 'string' || !to.trim().startsWith('+')) {
      return {
        ok: false,
        errorCode: 'VALIDATION_ERROR',
        errorMessage: 'Invalid or missing E.164 recipient phone number.',
        metadata: { retryable: false },
      };
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const authHeader = `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`;

    const bodyParams = new URLSearchParams();
    bodyParams.append('To', to);
    if (payload.body && typeof payload.body === 'string') {
      bodyParams.append('Body', payload.body);
    }
    if (messagingServiceSid) {
      bodyParams.append('MessagingServiceSid', messagingServiceSid);
    } else if (from) {
      bodyParams.append('From', from);
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: bodyParams.toString(),
      });

      const responseText = await response.text();
      const data = this.parseJsonResponse(responseText);

      if (!response.ok) {
        const isRetryable = response.status === 429 || response.status >= 500;
        let errorCode = 'PROVIDER_ERROR';
        let errorMessage = 'External provider returned an error.';

        const twilioCode = typeof data.code === 'number' ? data.code : undefined;
        if (response.status === 401 || response.status === 403) {
          errorCode = 'AUTHENTICATION_ERROR';
          errorMessage = 'Provider authentication failed.';
        } else if (response.status === 429) {
          errorCode = 'RATE_LIMIT_EXCEEDED';
          errorMessage = 'Rate limit exceeded by provider.';
        } else if (twilioCode === 21608) {
          errorCode = 'TWILIO_UNVERIFIED_NUMBER';
          errorMessage = 'Destination number is unverified in sandbox.';
        } else if (twilioCode === 21211) {
          errorCode = 'TWILIO_INVALID_NUMBER';
          errorMessage = 'Destination number is invalid.';
        } else if (twilioCode === 21408) {
          errorCode = 'TWILIO_PERMISSION_DENIED';
          errorMessage = 'SMS permission denied for destination.';
        } else if (twilioCode) {
          errorCode = `TWILIO_${twilioCode}`;
          errorMessage = 'Twilio SMS dispatch failed.';
        }

        return {
          ok: false,
          errorCode,
          errorMessage,
          metadata: { status: response.status, retryable: isRetryable },
        };
      }

      const twilioSid = typeof data.sid === 'string' ? data.sid : undefined;

      return {
        ok: true,
        providerMessageId: twilioSid,
        metadata: { twilioSid },
      };
    } catch {
      return {
        ok: false,
        errorCode: 'NETWORK_ERROR',
        errorMessage: 'Network error occurred during SMS delivery.',
        metadata: { retryable: true },
      };
    }
  }
}
