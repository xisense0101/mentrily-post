import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { validatePlatformEnvironment, type EnvironmentSource } from '@mentrily/service-core';
import { AppModule } from '../modules/app.module.js';
import { registerCorrelationIdHook } from './correlation-id.hook.js';

export interface CreatedPlatformApiApp {
  app: NestFastifyApplication;
  environment: {
    nodeEnv: 'development' | 'test' | 'staging' | 'production';
    port: number;
    appName: string;
  };
}

export async function createPlatformApiApp(
  source: EnvironmentSource = process.env as EnvironmentSource,
): Promise<CreatedPlatformApiApp> {
  const environment = validatePlatformEnvironment(source);
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
    rawBody: true,
  });

  registerCorrelationIdHook(app.getHttpAdapter().getInstance());

  await app.init();

  return {
    app,
    environment,
  };
}
