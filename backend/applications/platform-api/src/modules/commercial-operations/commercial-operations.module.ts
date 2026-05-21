import { Module } from '@nestjs/common';
import { ENTITLEMENT_EVALUATOR } from '@mentrily/service-core';
import { SubjectAwareEntitlementEvaluator } from './infrastructure/security/workspace-entitlement.evaluator.js';
import { SubscriptionRepository } from './domain/repositories/subscription.repository.js';
import { PrincipalEntitlementRepository } from './domain/repositories/principal-entitlement.repository.js';
import { InMemorySubscriptionRepository } from './infrastructure/persistence/in-memory-subscription.repository.js';
import { InMemoryPrincipalEntitlementRepository } from './infrastructure/persistence/in-memory-principal-entitlement.repository.js';
import { FoundationModule } from '../../foundation/foundation.module.js';

@Module({
  imports: [FoundationModule],
  providers: [
    {
      provide: SubscriptionRepository,
      useClass: InMemorySubscriptionRepository,
    },
    {
      provide: PrincipalEntitlementRepository,
      useClass: InMemoryPrincipalEntitlementRepository,
    },
    {
      provide: ENTITLEMENT_EVALUATOR,
      useClass: SubjectAwareEntitlementEvaluator,
    },
  ],
  exports: [
    ENTITLEMENT_EVALUATOR,
  ],
})
export class CommercialOperationsModule {}
