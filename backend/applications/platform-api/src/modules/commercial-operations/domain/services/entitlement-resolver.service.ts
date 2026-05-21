import { EntitlementCatalog, EntitlementKeyString } from '../value-objects/entitlement-key.vo.js';
import { Plan } from '../entities/plan.entity.js';
import { Subscription } from '../entities/subscription.entity.js';

export const FreePlan: Plan = {
  id: 'plan_free',
  code: 'free',
  name: 'Free',
  isCustom: false,
  prices: [],
  entitlements: [
    { planId: 'plan_free', entitlementKey: EntitlementCatalog.EXAMS_MONTHLY_LIMIT, value: 2 },
    { planId: 'plan_free', entitlementKey: EntitlementCatalog.COURSES_LIMIT, value: 2 },
    { planId: 'plan_free', entitlementKey: EntitlementCatalog.LEARNERS_LIMIT, value: 50 },
    { planId: 'plan_free', entitlementKey: EntitlementCatalog.QUESTION_TYPES_BASIC_ONLY, value: true },
    { planId: 'plan_free', entitlementKey: EntitlementCatalog.TEAM_FEATURES_ENABLED, value: false },
    { planId: 'plan_free', entitlementKey: EntitlementCatalog.ADMIN_SEATS_LIMIT, value: 1 },
    { planId: 'plan_free', entitlementKey: EntitlementCatalog.CREATOR_SEATS_LIMIT, value: 1 },
    { planId: 'plan_free', entitlementKey: EntitlementCatalog.WHITE_LABEL_ENABLED, value: false },
    { planId: 'plan_free', entitlementKey: EntitlementCatalog.CUSTOM_DOMAINS_ENABLED, value: false },
    { planId: 'plan_free', entitlementKey: EntitlementCatalog.SSO_ENABLED, value: false },
    { planId: 'plan_free', entitlementKey: EntitlementCatalog.SCIM_ENABLED, value: false },
  ],
};

export const StarterPlan: Plan = {
  id: 'plan_starter',
  code: 'starter',
  name: 'Starter',
  isCustom: false,
  prices: [],
  entitlements: [
    { planId: 'plan_starter', entitlementKey: EntitlementCatalog.EXAMS_MONTHLY_LIMIT, value: 10 },
    { planId: 'plan_starter', entitlementKey: EntitlementCatalog.COURSES_LIMIT, value: 15 },
    { planId: 'plan_starter', entitlementKey: EntitlementCatalog.LEARNERS_LIMIT, value: 200 },
    { planId: 'plan_starter', entitlementKey: EntitlementCatalog.QUESTION_TYPES_BASIC_ONLY, value: false },
    { planId: 'plan_starter', entitlementKey: EntitlementCatalog.TEAM_FEATURES_ENABLED, value: true },
    { planId: 'plan_starter', entitlementKey: EntitlementCatalog.ADMIN_SEATS_LIMIT, value: 2 },
    { planId: 'plan_starter', entitlementKey: EntitlementCatalog.CREATOR_SEATS_LIMIT, value: 3 },
    { planId: 'plan_starter', entitlementKey: EntitlementCatalog.WHITE_LABEL_ENABLED, value: false },
    { planId: 'plan_starter', entitlementKey: EntitlementCatalog.CUSTOM_DOMAINS_ENABLED, value: false },
    { planId: 'plan_starter', entitlementKey: EntitlementCatalog.SSO_ENABLED, value: false },
    { planId: 'plan_starter', entitlementKey: EntitlementCatalog.SCIM_ENABLED, value: false },
  ],
};

export const ProPlan: Plan = {
  id: 'plan_pro',
  code: 'pro',
  name: 'Pro',
  isCustom: false,
  prices: [],
  entitlements: [
    { planId: 'plan_pro', entitlementKey: EntitlementCatalog.EXAMS_MONTHLY_LIMIT, value: 20 },
    { planId: 'plan_pro', entitlementKey: EntitlementCatalog.COURSES_LIMIT, value: 30 },
    { planId: 'plan_pro', entitlementKey: EntitlementCatalog.LEARNERS_LIMIT, value: 1000 },
    { planId: 'plan_pro', entitlementKey: EntitlementCatalog.QUESTION_TYPES_BASIC_ONLY, value: false },
    { planId: 'plan_pro', entitlementKey: EntitlementCatalog.TEAM_FEATURES_ENABLED, value: true },
    { planId: 'plan_pro', entitlementKey: EntitlementCatalog.ADMIN_SEATS_LIMIT, value: 5 },
    { planId: 'plan_pro', entitlementKey: EntitlementCatalog.CREATOR_SEATS_LIMIT, value: 10 },
    { planId: 'plan_pro', entitlementKey: EntitlementCatalog.WHITE_LABEL_ENABLED, value: false },
    { planId: 'plan_pro', entitlementKey: EntitlementCatalog.CUSTOM_DOMAINS_ENABLED, value: false },
    { planId: 'plan_pro', entitlementKey: EntitlementCatalog.SSO_ENABLED, value: false },
    { planId: 'plan_pro', entitlementKey: EntitlementCatalog.SCIM_ENABLED, value: false },
  ],
};

export const EnterprisePlan: Plan = {
  id: 'plan_enterprise',
  code: 'enterprise',
  name: 'Enterprise',
  isCustom: true,
  prices: [],
  entitlements: [
    { planId: 'plan_enterprise', entitlementKey: EntitlementCatalog.EXAMS_MONTHLY_LIMIT, value: 'unlimited' },
    { planId: 'plan_enterprise', entitlementKey: EntitlementCatalog.COURSES_LIMIT, value: 'unlimited' },
    { planId: 'plan_enterprise', entitlementKey: EntitlementCatalog.LEARNERS_LIMIT, value: 'unlimited' },
    { planId: 'plan_enterprise', entitlementKey: EntitlementCatalog.QUESTION_TYPES_BASIC_ONLY, value: false },
    { planId: 'plan_enterprise', entitlementKey: EntitlementCatalog.TEAM_FEATURES_ENABLED, value: true },
    { planId: 'plan_enterprise', entitlementKey: EntitlementCatalog.ADMIN_SEATS_LIMIT, value: 'unlimited' },
    { planId: 'plan_enterprise', entitlementKey: EntitlementCatalog.CREATOR_SEATS_LIMIT, value: 'unlimited' },
    { planId: 'plan_enterprise', entitlementKey: EntitlementCatalog.WHITE_LABEL_ENABLED, value: true },
    { planId: 'plan_enterprise', entitlementKey: EntitlementCatalog.CUSTOM_DOMAINS_ENABLED, value: true },
    { planId: 'plan_enterprise', entitlementKey: EntitlementCatalog.SSO_ENABLED, value: true },
    { planId: 'plan_enterprise', entitlementKey: EntitlementCatalog.SCIM_ENABLED, value: true },
  ],
};

export class EntitlementResolverService {
  /**
   * Resolves the final value of an entitlement for a given subscription,
   * checking overrides first, then falling back to the base plan entitlement.
   */
  static resolveValue(
    subscription: Subscription,
    plan: Plan,
    entitlementKey: EntitlementKeyString
  ): number | boolean | 'unlimited' | null {
    
    // 1. Check for active overrides on the subscription
    const activeOverride = subscription.overrides?.find(
      (override) =>
        override.entitlementKey === entitlementKey &&
        (!override.expiresAt || override.expiresAt > new Date())
    );

    if (activeOverride !== undefined) {
      return activeOverride.value;
    }

    // 2. Fall back to the plan's default entitlement
    const planEntitlement = plan.entitlements.find((e) => e.entitlementKey === entitlementKey);

    if (planEntitlement !== undefined) {
      return planEntitlement.value;
    }

    // Return null if entitlement is not defined anywhere
    return null;
  }
}
