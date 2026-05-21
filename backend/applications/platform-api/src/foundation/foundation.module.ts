import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import {
  AUDIT_RECORDER,
  ENTITLEMENT_EVALUATOR,
  OUTBOX_PUBLISHER,
  PERMISSION_EVALUATOR,
  TRANSACTION_RUNNER,
} from '@mentrily/service-core';
import { DataPlatformModule } from '@mentrily/data-platform';
import { FoundationHealthController } from './foundation-health.controller.js';
import {
  DefaultPermissionEvaluator,
  DefaultEntitlementEvaluator,
} from './default-foundation.providers.js';
import { concreteFoundationProviders } from './concrete-foundation.providers.js';
import { getPlatformEnvironment, PLATFORM_ENVIRONMENT } from './platform-environment.provider.js';
import { SharedExceptionFilter } from './shared-exception.filter.js';

@Module({
  imports: [DataPlatformModule],
  controllers: [FoundationHealthController],
  providers: [
    // Use concrete durable adapters for audit/outbox (Prisma-backed)
    ...concreteFoundationProviders,
    // Use default implementations for permission/entitlement evaluation (fail-closed)
    {
      provide: PERMISSION_EVALUATOR,
      useClass: DefaultPermissionEvaluator,
    },
    {
      provide: ENTITLEMENT_EVALUATOR,
      useClass: DefaultEntitlementEvaluator,
    },
    {
      provide: PLATFORM_ENVIRONMENT,
      useFactory: () => getPlatformEnvironment(),
    },
    {
      provide: APP_FILTER,
      useClass: SharedExceptionFilter,
    },
  ],
  exports: [
    PLATFORM_ENVIRONMENT,
    PERMISSION_EVALUATOR,
    ENTITLEMENT_EVALUATOR,
    AUDIT_RECORDER,
    OUTBOX_PUBLISHER,
    TRANSACTION_RUNNER,
  ],
})
export class FoundationModule {}
