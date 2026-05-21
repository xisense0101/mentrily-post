import { describe, it, expect, beforeEach } from 'vitest';
import { 
  EntitlementKey, 
  EntitlementCatalog,
  Subscription,
  SubscriptionStatus,
  FreePlan,
  StarterPlan,
  ProPlan,
  EnterprisePlan,
  EntitlementResolverService,
} from '../domain/index.js';

describe('Commercial Operations: Entitlement Domain', () => {
  describe('EntitlementKey', () => {
    it('should validate correctly formatted keys', () => {
      expect(() => new EntitlementKey('courses.limit')).not.toThrow();
      expect(() => new EntitlementKey('exams.monthly_limit')).not.toThrow();
      expect(() => new EntitlementKey('team_features.enabled')).not.toThrow();
    });

    it('should reject invalid keys', () => {
      expect(() => new EntitlementKey('coursesLimit')).toThrow('Invalid entitlement key format: coursesLimit');
      expect(() => new EntitlementKey('courses..limit')).toThrow('Invalid entitlement key format: courses..limit');
      expect(() => new EntitlementKey('COURSES.LIMIT')).toThrow('Invalid entitlement key format: COURSES.LIMIT');
      expect(() => new EntitlementKey('courses.')).toThrow('Invalid entitlement key format: courses.');
    });
  });

  describe('Plan Presets', () => {
    it('should correctly configure the Free plan limits', () => {
      expect(FreePlan.entitlements.find(e => e.entitlementKey === EntitlementCatalog.COURSES_LIMIT)?.value).toBe(2);
      expect(FreePlan.entitlements.find(e => e.entitlementKey === EntitlementCatalog.EXAMS_MONTHLY_LIMIT)?.value).toBe(2);
      expect(FreePlan.entitlements.find(e => e.entitlementKey === EntitlementCatalog.LEARNERS_LIMIT)?.value).toBe(50);
      expect(FreePlan.entitlements.find(e => e.entitlementKey === EntitlementCatalog.QUESTION_TYPES_BASIC_ONLY)?.value).toBe(true);
      expect(FreePlan.entitlements.find(e => e.entitlementKey === EntitlementCatalog.TEAM_FEATURES_ENABLED)?.value).toBe(false);
    });

    it('should correctly configure the Starter plan limits', () => {
      expect(StarterPlan.entitlements.find(e => e.entitlementKey === EntitlementCatalog.COURSES_LIMIT)?.value).toBe(15);
      expect(StarterPlan.entitlements.find(e => e.entitlementKey === EntitlementCatalog.EXAMS_MONTHLY_LIMIT)?.value).toBe(10);
      expect(StarterPlan.entitlements.find(e => e.entitlementKey === EntitlementCatalog.LEARNERS_LIMIT)?.value).toBe(200);
      expect(StarterPlan.entitlements.find(e => e.entitlementKey === EntitlementCatalog.QUESTION_TYPES_BASIC_ONLY)?.value).toBe(false);
      expect(StarterPlan.entitlements.find(e => e.entitlementKey === EntitlementCatalog.TEAM_FEATURES_ENABLED)?.value).toBe(true);
    });

    it('should correctly configure the Pro plan limits', () => {
      expect(ProPlan.entitlements.find(e => e.entitlementKey === EntitlementCatalog.COURSES_LIMIT)?.value).toBe(30);
      expect(ProPlan.entitlements.find(e => e.entitlementKey === EntitlementCatalog.EXAMS_MONTHLY_LIMIT)?.value).toBe(20);
      expect(ProPlan.entitlements.find(e => e.entitlementKey === EntitlementCatalog.LEARNERS_LIMIT)?.value).toBe(1000);
      expect(ProPlan.entitlements.find(e => e.entitlementKey === EntitlementCatalog.WHITE_LABEL_ENABLED)?.value).toBe(false);
      expect(ProPlan.entitlements.find(e => e.entitlementKey === EntitlementCatalog.CUSTOM_DOMAINS_ENABLED)?.value).toBe(false);
    });

    it('should represent Enterprise limits as unlimited', () => {
      expect(EnterprisePlan.entitlements.find(e => e.entitlementKey === EntitlementCatalog.COURSES_LIMIT)?.value).toBe('unlimited');
      expect(EnterprisePlan.entitlements.find(e => e.entitlementKey === EntitlementCatalog.EXAMS_MONTHLY_LIMIT)?.value).toBe('unlimited');
      expect(EnterprisePlan.entitlements.find(e => e.entitlementKey === EntitlementCatalog.LEARNERS_LIMIT)?.value).toBe('unlimited');
      expect(EnterprisePlan.entitlements.find(e => e.entitlementKey === EntitlementCatalog.SSO_ENABLED)?.value).toBe(true);
    });
  });

  describe('EntitlementResolverService', () => {
    let mockSubscription: Subscription;

    beforeEach(() => {
      mockSubscription = {
        id: 'sub_123',
        workspaceId: 'workspace_123',
        planId: 'plan_starter',
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        cancelAtPeriodEnd: false,
        overrides: [],
      };
    });

    it('should return plan value when no overrides exist', () => {
      const coursesLimit = EntitlementResolverService.resolveValue(
        mockSubscription, 
        StarterPlan, 
        EntitlementCatalog.COURSES_LIMIT
      );
      expect(coursesLimit).toBe(15);
    });

    it('should prioritize override value if it exists and is active', () => {
      mockSubscription.overrides.push({
        id: 'ov_123',
        subscriptionId: mockSubscription.id,
        entitlementKey: EntitlementCatalog.COURSES_LIMIT,
        value: 20, // Override Starter from 15 -> 20
      });

      const coursesLimit = EntitlementResolverService.resolveValue(
        mockSubscription, 
        StarterPlan, 
        EntitlementCatalog.COURSES_LIMIT
      );
      expect(coursesLimit).toBe(20);
    });

    it('should ignore expired overrides and fall back to plan value', () => {
      mockSubscription.overrides.push({
        id: 'ov_123',
        subscriptionId: mockSubscription.id,
        entitlementKey: EntitlementCatalog.COURSES_LIMIT,
        value: 20,
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
      });

      const coursesLimit = EntitlementResolverService.resolveValue(
        mockSubscription, 
        StarterPlan, 
        EntitlementCatalog.COURSES_LIMIT
      );
      expect(coursesLimit).toBe(15);
    });

    it('should correctly handle unlimited overrides', () => {
      mockSubscription.overrides.push({
        id: 'ov_123',
        subscriptionId: mockSubscription.id,
        entitlementKey: EntitlementCatalog.COURSES_LIMIT,
        value: 'unlimited',
      });

      const coursesLimit = EntitlementResolverService.resolveValue(
        mockSubscription, 
        StarterPlan, 
        EntitlementCatalog.COURSES_LIMIT
      );
      expect(coursesLimit).toBe('unlimited');
    });

    it('should return null for undefined entitlements', () => {
      const result = EntitlementResolverService.resolveValue(
        mockSubscription, 
        StarterPlan, 
        'some.unknown.entitlement' as any
      );
      expect(result).toBeNull();
    });
  });
});
