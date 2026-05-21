import { Injectable, Inject } from '@nestjs/common';
import { 
  EntitlementEvaluator, 
  EntitlementEvaluationInput, 
  EntitlementEvaluationResult, 
  RequestContext 
} from '@mentrily/service-core';
import { SubscriptionRepository } from '../../domain/repositories/subscription.repository.js';
import { PrincipalEntitlementRepository } from '../../domain/repositories/principal-entitlement.repository.js';
import { EntitlementResolverService, FreePlan } from '../../domain/index.js';
import { EntitlementKey } from '../../domain/value-objects/entitlement-key.vo.js';
import { Subscription } from '../../domain/entities/subscription.entity.js';
import { PrincipalEntitlementProfile } from '../../domain/entities/principal-entitlement-profile.entity.js';

@Injectable()
export class SubjectAwareEntitlementEvaluator implements EntitlementEvaluator {
  constructor(
    @Inject(SubscriptionRepository) private readonly subRepo: SubscriptionRepository,
    @Inject(PrincipalEntitlementRepository) private readonly principalRepo: PrincipalEntitlementRepository,
  ) {}

  async evaluate(
    input: EntitlementEvaluationInput,
    _context: RequestContext,
  ): Promise<EntitlementEvaluationResult> {
    // 1. Validate the entitlement key format
    try {
      new EntitlementKey(input.entitlementKey);
    } catch {
      return { enabled: false, reason: `Invalid entitlement format: ${input.entitlementKey}` };
    }

    if (!input.subject || (input.subject.kind !== 'workspace' && input.subject.kind !== 'principal')) {
      return { enabled: false, reason: 'Invalid entitlement subject' };
    }

    let subscription: Subscription;
    let plan = FreePlan;

    if (input.subject.kind === 'workspace') {
      if (!input.subject.workspaceId) {
        return { enabled: false, reason: 'Invalid workspace entitlement subject' };
      }
      const active = await this.subRepo.getActiveSubscription(input.subject.workspaceId);
      const activePlan = active ? await this.subRepo.getPlan(active.planId) : null;
      subscription = active ?? {
        id: 'mock_free_workspace_sub',
        workspaceId: input.subject.workspaceId,
        planId: FreePlan.id,
        status: 'ACTIVE' as any,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
        overrides: [],
      };
      plan = activePlan ?? FreePlan;
    } else {
      if (!input.subject.principalId) {
        return { enabled: false, reason: 'Invalid principal entitlement subject' };
      }
      const profile: PrincipalEntitlementProfile | null = await this.principalRepo.getByPrincipalId(input.subject.principalId);
      if (!profile) {
        return { enabled: false, reason: 'Missing principal entitlement profile' };
      }
      const resolvedPlan = await this.subRepo.getPlan(profile.planId);
      plan = resolvedPlan ?? FreePlan;
      subscription = {
        id: `principal_profile_${profile.principalId}`,
        workspaceId: `principal:${profile.principalId}`,
        planId: plan.id,
        status: 'ACTIVE' as any,
        currentPeriodStart: profile.createdAt,
        currentPeriodEnd: profile.updatedAt,
        cancelAtPeriodEnd: false,
        overrides: profile.overrides.map((override, index) => {
          const mapped = {
            id: `principal_override_${profile.principalId}_${index}`,
            subscriptionId: `principal_profile_${profile.principalId}`,
            entitlementKey: override.entitlementKey,
            value: override.value,
          } as const;
          return override.expiresAt ? { ...mapped, expiresAt: override.expiresAt } : mapped;
        }),
      };
    }

    // Resolve the entitlement value
    const value = EntitlementResolverService.resolveValue(subscription, plan, input.entitlementKey as any);

    // 6. Evaluate based on value type
    if (value === null || value === undefined) {
      return { enabled: false, reason: `Entitlement not defined for plan: ${plan.name}` };
    }

    if (typeof value === 'boolean') {
      return { 
        enabled: value, 
        ...(value ? {} : { reason: `Feature is disabled on plan: ${plan.name}` })
      };
    }

    if (value === 'unlimited') {
      return { enabled: true };
    }

    if (typeof value === 'number') {
      // For numeric limits, we only verify that the limit is > 0 (meaning the feature is accessible).
      // Full usage tracking requires checking the ledger, which is done elsewhere.
      return { 
        enabled: value > 0, 
        ...(value > 0 ? {} : { reason: `Limit is 0 on plan: ${plan.name}` })
      };
    }

    return { enabled: false, reason: 'Unknown entitlement value type' };
  }
}
