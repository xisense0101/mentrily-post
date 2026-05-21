import { AppError } from './errors.js';

export type RuntimeEnvironment = 'development' | 'test' | 'staging' | 'production';

export type EnvironmentSource = Record<string, string | undefined>;

export interface PlatformEnvironment {
  nodeEnv: RuntimeEnvironment;
  port: number;
  appName: string;
}

export function validatePlatformEnvironment(source: EnvironmentSource): PlatformEnvironment {
  const nodeEnvRaw = source.NODE_ENV?.trim();
  const portRaw = source.PORT?.trim();
  const appNameRaw = source.APP_NAME?.trim();

  const nodeEnv = toRuntimeEnvironment(nodeEnvRaw);
  const port = toPort(portRaw);
  const appName = appNameRaw || 'platform-api';

  return {
    nodeEnv,
    port,
    appName,
  };
}

function toRuntimeEnvironment(value: string | undefined): RuntimeEnvironment {
  if (!value) {
    return 'development';
  }

  if (value === 'development' || value === 'test' || value === 'staging' || value === 'production') {
    return value;
  }

  throw new AppError('VALIDATION_ERROR', 'NODE_ENV must be one of development, test, staging, production.', 500, {
    field: 'NODE_ENV',
  });
}

function toPort(value: string | undefined): number {
  if (!value) {
    return 4000;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new AppError('VALIDATION_ERROR', 'PORT must be a valid integer between 1 and 65535.', 500, {
      field: 'PORT',
    });
  }

  return parsed;
}
