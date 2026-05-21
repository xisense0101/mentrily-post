import {
  validatePlatformEnvironment,
  type EnvironmentSource,
  type PlatformEnvironment,
} from '@mentrily/service-core';

export const PLATFORM_ENVIRONMENT = Symbol('PLATFORM_ENVIRONMENT');

export type PlatformEnvironmentValue = PlatformEnvironment;

export function getPlatformEnvironment(
  source: EnvironmentSource = process.env as EnvironmentSource,
): PlatformEnvironment {
  return validatePlatformEnvironment(source);
}
