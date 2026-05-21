import { AppError, type EnvironmentSource } from '@mentrily/service-core';

export type CommunicationProviderMode =
  | 'NOOP'
  | 'FIXTURE'
  | 'RESERVED_EMAIL'
  | 'RESERVED_SMS';

export type ReservedEmailProvider = 'RESEND_RESERVED' | 'SENDGRID_RESERVED' | 'SMTP_RESERVED';
export type ReservedSmsProvider = 'TWILIO_RESERVED';

export interface NotificationProviderFeatureFlags {
  emailProviderEnabled: boolean;
  smsProviderEnabled: boolean;
  allowLiveDelivery: boolean;
}

export interface NotificationProviderConfig {
  defaultProvider: CommunicationProviderMode;
  emailProvider?: ReservedEmailProvider | undefined;
  smsProvider?: ReservedSmsProvider | undefined;
  featureFlags: NotificationProviderFeatureFlags;
}

export const NOTIFICATION_PROVIDER_CONFIG = Symbol('NOTIFICATION_PROVIDER_CONFIG');

const DEFAULT_NOTIFICATION_PROVIDER_CONFIG: NotificationProviderConfig = {
  defaultProvider: 'NOOP',
  featureFlags: {
    emailProviderEnabled: false,
    smsProviderEnabled: false,
    allowLiveDelivery: false,
  },
};

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.trim() === '') {
    return fallback;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  throw new AppError('VALIDATION_ERROR', 'invalid communication provider boolean configuration', 500);
}

function parseDefaultProvider(value: string | undefined): CommunicationProviderMode {
  if (value === undefined || value.trim() === '') {
    return DEFAULT_NOTIFICATION_PROVIDER_CONFIG.defaultProvider;
  }

  switch (value.trim()) {
    case 'NOOP':
    case 'FIXTURE':
    case 'RESERVED_EMAIL':
    case 'RESERVED_SMS':
      return value.trim() as CommunicationProviderMode;
    default:
      throw new AppError('VALIDATION_ERROR', 'invalid communication provider mode configuration', 500);
  }
}

function parseReservedEmailProvider(value: string | undefined): ReservedEmailProvider | undefined {
  if (value === undefined || value.trim() === '' || value.trim() === 'RESERVED_NONE') {
    return undefined;
  }

  switch (value.trim()) {
    case 'RESEND_RESERVED':
    case 'SENDGRID_RESERVED':
    case 'SMTP_RESERVED':
      return value.trim() as ReservedEmailProvider;
    default:
      throw new AppError('VALIDATION_ERROR', 'invalid communication email provider configuration', 500);
  }
}

function parseReservedSmsProvider(value: string | undefined): ReservedSmsProvider | undefined {
  if (value === undefined || value.trim() === '' || value.trim() === 'RESERVED_NONE') {
    return undefined;
  }

  if (value.trim() === 'TWILIO_RESERVED') {
    return 'TWILIO_RESERVED';
  }

  throw new AppError('VALIDATION_ERROR', 'invalid communication sms provider configuration', 500);
}

function isTestEnvironment(source: EnvironmentSource): boolean {
  return source.NODE_ENV === 'test' || source.APP_ENV === 'test';
}

function validateConfig(config: NotificationProviderConfig, source: EnvironmentSource): NotificationProviderConfig {
  if (config.defaultProvider === 'FIXTURE' && !isTestEnvironment(source)) {
    throw new AppError('VALIDATION_ERROR', 'fixture communication provider is only allowed in test environments', 500);
  }

  if (config.defaultProvider === 'RESERVED_EMAIL' && !config.emailProvider) {
    throw new AppError('VALIDATION_ERROR', 'reserved email provider mode requires an email provider selection', 500);
  }

  if (config.defaultProvider === 'RESERVED_SMS' && !config.smsProvider) {
    throw new AppError('VALIDATION_ERROR', 'reserved sms provider mode requires an sms provider selection', 500);
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
    featureFlags: {
      emailProviderEnabled: parseBoolean(
        source.COMMUNICATION_EMAIL_PROVIDER_ENABLED,
        DEFAULT_NOTIFICATION_PROVIDER_CONFIG.featureFlags.emailProviderEnabled,
      ),
      smsProviderEnabled: parseBoolean(
        source.COMMUNICATION_SMS_PROVIDER_ENABLED,
        DEFAULT_NOTIFICATION_PROVIDER_CONFIG.featureFlags.smsProviderEnabled,
      ),
      allowLiveDelivery: parseBoolean(
        source.COMMUNICATION_ALLOW_LIVE_DELIVERY,
        DEFAULT_NOTIFICATION_PROVIDER_CONFIG.featureFlags.allowLiveDelivery,
      ),
    },
  };

  return validateConfig(config, source);
}

export function getSafeNotificationProviderConfig(): NotificationProviderConfig {
  return structuredClone(DEFAULT_NOTIFICATION_PROVIDER_CONFIG);
}
