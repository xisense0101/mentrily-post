import { describe, expect, it } from 'vitest';
import { AppError } from '../errors.js';
import { validatePlatformEnvironment } from '../environment.js';

describe('validatePlatformEnvironment', () => {
  it('returns defaults when NODE_ENV and PORT are not set', () => {
    const environment = validatePlatformEnvironment({});

    expect(environment).toEqual({
      nodeEnv: 'development',
      port: 4000,
      appName: 'platform-api',
    });
  });

  it('throws AppError when PORT is invalid', () => {
    expect(() => validatePlatformEnvironment({ PORT: 'abc' })).toThrowError(AppError);
  });

  it('throws AppError when NODE_ENV is invalid', () => {
    expect(() => validatePlatformEnvironment({ NODE_ENV: 'qa' })).toThrowError(AppError);
  });
});
