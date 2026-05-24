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

  private async sendEmail(
    payload: Record<string, unknown>,
  ): Promise<NotificationProviderTransportResult> {
    const apiKey = this.config.resendApiKey;
    if (!apiKey) {
      return {
        ok: false,
        errorCode: 'MISSING_API_KEY',
        errorMessage: 'Resend API key is missing.',
        metadata: { retryable: false },
      };
    }

    const from = this.config.resendFromEmail || 'noreply@mentrily.com';
    const replyTo = this.config.resendReplyToEmail || 'support@mentrily.com';

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: payload.to,
          subject: payload.subject,
          text: payload.bodyText,
          html: payload.bodyHtml || undefined,
          reply_to: replyTo,
        }),
      });

      const responseText = await response.text();
      let data: any = {};
      try {
        if (responseText) {
          data = JSON.parse(responseText);
        }
      } catch {
        // Fallback if not JSON
      }

      if (!response.ok) {
        const isRetryable = response.status === 429 || response.status >= 500;
        return {
          ok: false,
          errorCode: data?.name || `HTTP_${response.status}`,
          errorMessage: data?.message || responseText || 'Failed to send email via Resend',
          metadata: { status: response.status, retryable: isRetryable },
        };
      }

      return {
        ok: true,
        providerMessageId: data?.id,
        metadata: { resendId: data?.id },
      };
    } catch (error: any) {
      return {
        ok: false,
        errorCode: 'FETCH_ERROR',
        errorMessage: error?.message || 'Network error occurred during email delivery',
        metadata: { retryable: true },
      };
    }
  }

  private async sendSms(
    payload: Record<string, unknown>,
  ): Promise<NotificationProviderTransportResult> {
    const accountSid = this.config.twilioAccountSid;
    const authToken = this.config.twilioAuthToken;
    if (!accountSid || !authToken) {
      return {
        ok: false,
        errorCode: 'MISSING_CREDENTIALS',
        errorMessage: 'Twilio accountSid or authToken is missing.',
        metadata: { retryable: false },
      };
    }

    const from = this.config.twilioFromNumber;
    const messagingServiceSid = this.config.twilioMessagingServiceSid;
    if (!from && !messagingServiceSid) {
      return {
        ok: false,
        errorCode: 'MISSING_FROM',
        errorMessage: 'Twilio from number or messaging service sid is missing.',
        metadata: { retryable: false },
      };
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const authHeader = `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`;

    const bodyParams = new URLSearchParams();
    if (payload.to && typeof payload.to === 'string') {
      bodyParams.append('To', payload.to);
    }
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
      let data: any = {};
      try {
        if (responseText) {
          data = JSON.parse(responseText);
        }
      } catch {
        // Fallback if not JSON
      }

      if (!response.ok) {
        const isRetryable = response.status === 429 || response.status >= 500;
        return {
          ok: false,
          errorCode: data?.code ? `TWILIO_${data.code}` : `HTTP_${response.status}`,
          errorMessage: data?.message || responseText || 'Failed to send SMS via Twilio',
          metadata: { status: response.status, retryable: isRetryable },
        };
      }

      return {
        ok: true,
        providerMessageId: data?.sid,
        metadata: { twilioSid: data?.sid },
      };
    } catch (error: any) {
      return {
        ok: false,
        errorCode: 'FETCH_ERROR',
        errorMessage: error?.message || 'Network error occurred during SMS delivery',
        metadata: { retryable: true },
      };
    }
  }
}
