import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createPlatformApiApp } from './create-platform-api-app.js';

describe('foundation endpoints', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    try {
      process.env.APP_NAME = 'platform-api-test';
      process.env.DATABASE_URL = 'postgresql://mentrily:mentrily@localhost:5433/mentrily_test';
      const created = await createPlatformApiApp({
        NODE_ENV: 'test',
        PORT: '4100',
        APP_NAME: 'platform-api-test',
        DATABASE_URL: 'postgresql://mentrily:mentrily@localhost:5433/mentrily_test',
      });
      app = created.app;
    } catch (error) {
      console.error('Failed to create app:', error);
      throw error;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns health and preserves request ID header', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
      headers: {
        'x-request-id': 'request-123',
      },
    });

    expect(response.statusCode).toBe(200);

    const body = response.json();
    expect(body.status).toBe('ok');
    expect(body.service).toBe('platform-api-test');
    expect(body.requestId).toBe('request-123');
    expect(response.headers['x-request-id']).toBe('request-123');
  });

  it('returns readiness payload', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/ready',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();

    expect(body.status).toBe('ready');
    expect(body.checks.environment).toBe('ok');
  });

  it('generates request ID header when missing', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['x-request-id']).toBeTruthy();
    expect(response.headers['x-correlation-id']).toBeTruthy();
  });
});
