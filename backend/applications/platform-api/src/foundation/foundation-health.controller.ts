import { Controller, Get, Inject, Req } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import {
  PLATFORM_ENVIRONMENT,
  type PlatformEnvironmentValue,
} from './platform-environment.provider.js';

@Controller()
export class FoundationHealthController {
  constructor(
    @Inject(PLATFORM_ENVIRONMENT) private readonly environment: PlatformEnvironmentValue,
  ) {}

  @Get('/health')
  health(@Req() request: FastifyRequest) {
    return {
      status: 'ok',
      service: this.environment.appName,
      requestId: request.requestContext?.requestId,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('/ready')
  readiness() {
    return {
      status: 'ready',
      checks: {
        environment: 'ok',
      },
      service: this.environment.appName,
      timestamp: new Date().toISOString(),
    };
  }
}
