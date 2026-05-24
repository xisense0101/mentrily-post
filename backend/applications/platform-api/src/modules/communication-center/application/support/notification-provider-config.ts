import { AppError, type EnvironmentSource } from '@mentrily/service-core';

export type CommunicationProviderMode =
  | 'NOOP'
  | 'FIXTURE'
  | 'RESERVED_EMAIL'
  | 'RESERVED_SMS'
  | 'RESERVED_PUSH';

export type ReservedEmailProvider = 'RESEND_RESERVED' | 'SENDGRID_RESERVED' | 'SMTP_RESERVED';
export type ReservedSmsProvider = 'TWILIO_RESERVED';
export type ReservedPushProvider = 'PUSH_RESERVED';

export interface NotificationProviderFeatureFlags {
  emailProviderEnabled: boolean;
  smsProviderEnabled: boolean;
  pushProviderEnabled: boolean;
  allowLiveDelivery: boolean;
}

export interface NotificationProviderConfig {
  defaultProvider: CommunicationProviderMode;
  emailProvider?: ReservedEmailProvider | undefined;
  smsProvider?: ReservedSmsProvider | undefined;
  pushProvider?: ReservedPushProvider | undefined;
  featureFlags: NotificationProviderFeatureFlags;
  resendApiKey?: string | undefined;
  resendFromEmail?: string | undefined;
  resendReplyToEmail?: string | undefined;
  twilioAccountSid?: string | undefined;
  twilioAuthToken?: string | undefined;
  twilioMessagingServiceSid?: string | undefined;
  twilioFromNumber?: string | undefined;
  pushProviderReservedConfig?: string | undefined;
}

export const NOTIFICATION_PROVIDER_CONFIG = Symbol('NOTIFICATION_PROVIDER_CONFIG');

const DEFAULT_NOTIFICATION_PROVIDER_CONFIG: NotificationProviderConfig = {
  defaultProvider: 'NOOP',
  featureFlags: {
    emailProviderEnabled: false,
    smsProviderEnabled: false,
    pushProviderEnabled: false,
    allowLiveDelivery: false,
  },
};

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.trim() === '') {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') {
    return true;
  }

  if (normalized === 'false') {
    return false;
  }

  throw new AppError(
    'VALIDATION_ERROR',
    'invalid communication provider boolean configuration',
    500,
  );
}

function parseDefaultProvider(value: string | undefined): CommunicationProviderMode {
  if (value === undefined || value.trim() === '') {
    return DEFAULT_NOTIFICATION_PROVIDER_CONFIG.defaultProvider;
  }

  const normalized = value.trim().toUpperCase();
  switch (normalized) {
    case 'NOOP':
    case 'FIXTURE':
    case 'RESERVED_EMAIL':
    case 'RESERVED_SMS':
    case 'RESERVED_PUSH':
      return normalized as CommunicationProviderMode;
    default:
      throw new AppError(
        'VALIDATION_ERROR',
        'invalid communication provider mode configuration',
        500,
      );
  }
}

function parseReservedEmailProvider(value: string | undefined): ReservedEmailProvider | undefined {
  if (
    value === undefined ||
    value.trim() === '' ||
    value.trim() === 'RESERVED_NONE' ||
    value.trim().toLowerCase() === 'noop'
  ) {
    return undefined;
  }

  const normalized = value.trim().toUpperCase();
  switch (normalized) {
    case 'RESEND_RESERVED':
    case 'SENDGRID_RESERVED':
    case 'SMTP_RESERVED':
      return normalized as ReservedEmailProvider;
    default:
      throw new AppError(
        'VALIDATION_ERROR',
        'invalid communication email provider configuration',
        500,
      );
  }
}

function parseReservedSmsProvider(value: string | undefined): ReservedSmsProvider | undefined {
  if (
    value === undefined ||
    value.trim() === '' ||
    value.trim() === 'RESERVED_NONE' ||
    value.trim().toLowerCase() === 'noop'
  ) {
    return undefined;
  }

  const normalized = value.trim().toUpperCase();
  if (normalized === 'TWILIO_RESERVED') {
    return 'TWILIO_RESERVED';
  }

  throw new AppError('VALIDATION_ERROR', 'invalid communication sms provider configuration', 500);
}

function parseReservedPushProvider(value: string | undefined): ReservedPushProvider | undefined {
  if (
    value === undefined ||
    value.trim() === '' ||
    value.trim() === 'RESERVED_NONE' ||
    value.trim().toLowerCase() === 'noop'
  ) {
    return undefined;
  }

  const normalized = value.trim().toUpperCase();
  if (normalized === 'PUSH_RESERVED') {
    return 'PUSH_RESERVED';
  }

  throw new AppError('VALIDATION_ERROR', 'invalid communication push provider configuration', 500);
}

function isTestEnvironment(source: EnvironmentSource): boolean {
  return source.NODE_ENV === 'test' || source.APP_ENV === 'test';
}

function validateConfig(
  config: NotificationProviderConfig,
  source: EnvironmentSource,
): NotificationProviderConfig {
  if (config.defaultProvider === 'FIXTURE' && !isTestEnvironment(source)) {
    throw new AppError(
      'VALIDATION_ERROR',
      'fixture communication provider is only allowed in test environments',
      500,
    );
  }

  if (config.defaultProvider === 'RESERVED_EMAIL' && !config.emailProvider) {
    throw new AppError(
      'VALIDATION_ERROR',
      'reserved email provider mode requires an email provider selection',
      500,
    );
  }

  if (config.defaultProvider === 'RESERVED_SMS' && !config.smsProvider) {
    throw new AppError(
      'VALIDATION_ERROR',
      'reserved sms provider mode requires an sms provider selection',
      500,
    );
  }

  if (config.defaultProvider === 'RESERVED_PUSH' && !config.pushProvider) {
    throw new AppError(
      'VALIDATION_ERROR',
      'reserved push provider mode requires a push provider selection',
      500,
    );
  }

  return config;
}

export function loadNotificationProviderConfig(
  source: EnvironmentSource = process.env as EnvironmentSource,
): NotificationProviderConfig {
  const config: NotificationProviderConfig = {
    defaultProvider: parseDefaultProvider(source.COMMUNICATION_PROVIDER_MODE),
    emailProvider: parseReservedEmailProvider(source.COMMUNICATION_EMAIL_PROVIDER),
    smsProvider: parseReservedSmsProvider(source.COMMUNICATION_SMS_PROVIDER),
    pushProvider: parseReservedPushProvider(source.COMMUNICATION_PUSH_PROVIDER),
    featureFlags: {
      emailProviderEnabled: parseBoolean(
        source.COMMUNICATION_EMAIL_PROVIDER_ENABLED,
        DEFAULT_NOTIFICATION_PROVIDER_CONFIG.featureFlags.emailProviderEnabled,
      ),
      smsProviderEnabled: parseBoolean(
        source.COMMUNICATION_SMS_PROVIDER_ENABLED,
        DEFAULT_NOTIFICATION_PROVIDER_CONFIG.featureFlags.smsProviderEnabled,
      ),
      pushProviderEnabled: parseBoolean(
        source.COMMUNICATION_PUSH_PROVIDER_ENABLED,
        DEFAULT_NOTIFICATION_PROVIDER_CONFIG.featureFlags.pushProviderEnabled,
      ),
      allowLiveDelivery: parseBoolean(
        source.COMMUNICATION_ALLOW_LIVE_DELIVERY,
        DEFAULT_NOTIFICATION_PROVIDER_CONFIG.featureFlags.allowLiveDelivery,
      ),
    },
    resendApiKey: source.RESEND_API_KEY || source.MAIL_PROVIDER_API_KEY,
    resendFromEmail:
      source.COMMUNICATION_EMAIL_FROM || source.RESEND_FROM_EMAIL || 'noreply@mentrily.com',
    resendReplyToEmail:
      source.COMMUNICATION_EMAIL_REPLY_TO || source.RESEND_REPLY_TO_EMAIL || 'support@mentrily.com',
    twilioAccountSid: source.TWILIO_ACCOUNT_SID,
    twilioAuthToken: source.TWILIO_AUTH_TOKEN,
    twilioMessagingServiceSid: source.TWILIO_MESSAGING_SERVICE_SID,
    twilioFromNumber: source.COMMUNICATION_SMS_FROM || source.TWILIO_FROM_NUMBER,
    pushProviderReservedConfig: source.PUSH_PROVIDER_RESERVED_CONFIG,
  };

  return validateConfig(config, source);
}

export function getSafeNotificationProviderConfig(): NotificationProviderConfig {
  return structuredClone(DEFAULT_NOTIFICATION_PROVIDER_CONFIG);
}
