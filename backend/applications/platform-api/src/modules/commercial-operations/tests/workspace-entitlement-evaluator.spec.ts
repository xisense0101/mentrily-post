import { describe, it, expect, beforeEach } from 'vitest';
import { SubjectAwareEntitlementEvaluator } from '../infrastructure/security/workspace-entitlement.evaluator.js';
import { InMemorySubscriptionRepository } from '../infrastructure/persistence/in-memory-subscription.repository.js';
import { InMemoryPrincipalEntitlementRepository } from '../infrastructure/persistence/in-memory-principal-entitlement.repository.js';
import { RequestContext } from '@mentrily/service-core';
import { EntitlementCatalog, SubscriptionStatus, StarterPlan, ProPlan, EnterprisePlan } from '../domain/index.js';

describe('SubjectAwareEntitlementEvaluator', () => {
  let evaluator: SubjectAwareEntitlementEvaluator;
  let subRepo: InMemorySubscriptionRepository;
  let principalRepo: InMemoryPrincipalEntitlementRepository;

  beforeEach(() => {
    subRepo = new InMemorySubscriptionRepository();
    principalRepo = new InMemoryPrincipalEntitlementRepository();
    evaluator = new SubjectAwareEntitlementEvaluator(subRepo, principalRepo);
  });

  const createContext = (workspaceId?: string): RequestContext => {
    const ctx: RequestContext = {
      requestId: 'test-req',
      correlationId: 'test-cor',
      timestamp: new Date().toISOString(),
    };
    if (workspaceId) {
      ctx.workspace = { tenantId: 't1', workspaceId };
    }
    return ctx;
  };

  it('should deny malformed subject', async () => {
    const result = await evaluator.evaluate(
      { entitlementKey: EntitlementCatalog.COURSES_LIMIT, subject: {} as any },
      createContext()
    );
    expect(result.enabled).toBe(false);
    expect(result.reason).toContain('Invalid entitlement subject');
  });

  it('should deny invalid entitlement key format', async () => {
    const result = await evaluator.evaluate(
      { entitlementKey: 'invalid_format', subject: { kind: 'workspace', workspaceId: 'w1' } },
      createContext('w1')
    );
    expect(result.enabled).toBe(false);
    expect(result.reason).toContain('Invalid entitlement format');
  });

  it('should default to Free plan access if no subscription exists', async () => {
    // Basic types is TRUE on Free
    const resultTrue = await evaluator.evaluate(
      { entitlementKey: EntitlementCatalog.QUESTION_TYPES_BASIC_ONLY, subject: { kind: 'workspace', workspaceId: 'w1' } },
      createContext()
    );
    expect(resultTrue.enabled).toBe(true);

    // Team features is FALSE on Free
    const resultFalse = await evaluator.evaluate(
      { entitlementKey: EntitlementCatalog.TEAM_FEATURES_ENABLED, subject: { kind: 'workspace', workspaceId: 'w1' } },
      createContext()
    );
    expect(resultFalse.enabled).toBe(false);
    expect(resultFalse.reason).toContain('disabled on plan');
  });

  it('should evaluate Starter plan access correctly', async () => {
    subRepo.addSubscription({
      id: 'sub_1',
      workspaceId: 'w_starter',
      planId: StarterPlan.id,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(),
      cancelAtPeriodEnd: false,
      overrides: [],
    });

    const ctx = createContext('w_starter');

    // Basic types is FALSE on Starter
    const resultFalse = await evaluator.evaluate(
      { entitlementKey: EntitlementCatalog.QUESTION_TYPES_BASIC_ONLY, subject: { kind: 'workspace', workspaceId: 'w_starter' } },
      ctx
    );
    expect(resultFalse.enabled).toBe(false);

    // Team features is TRUE on Starter
    const resultTrue = await evaluator.evaluate(
      { entitlementKey: EntitlementCatalog.TEAM_FEATURES_ENABLED, subject: { kind: 'workspace', workspaceId: 'w_starter' } },
      ctx
    );
    expect(resultTrue.enabled).toBe(true);

    // Courses limit is > 0
    const resultNumeric = await evaluator.evaluate(
      { entitlementKey: EntitlementCatalog.COURSES_LIMIT, subject: { kind: 'workspace', workspaceId: 'w_starter' } },
      ctx
    );
    expect(resultNumeric.enabled).toBe(true);
  });

  it('should evaluate enterprise unlimited case correctly', async () => {
    subRepo.addSubscription({
      id: 'sub_2',
      workspaceId: 'w_ent',
      planId: EnterprisePlan.id,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(),
      cancelAtPeriodEnd: false,
      overrides: [],
    });

    const result = await evaluator.evaluate(
      { entitlementKey: EntitlementCatalog.COURSES_LIMIT, subject: { kind: 'workspace', workspaceId: 'w_ent' } },
      createContext('w_ent')
    );
    expect(result.enabled).toBe(true);
  });

  it('should apply override precedence', async () => {
    subRepo.addSubscription({
      id: 'sub_3',
      workspaceId: 'w_pro',
      planId: ProPlan.id,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(),
      cancelAtPeriodEnd: false,
      overrides: [
        {
          id: 'ov_1',
          subscriptionId: 'sub_3',
          entitlementKey: EntitlementCatalog.COURSES_LIMIT,
          value: 3,
        }
      ],
    });

    const result = await evaluator.evaluate(
      { entitlementKey: EntitlementCatalog.COURSES_LIMIT, subject: { kind: 'workspace', workspaceId: 'w_pro' } },
      createContext('w_pro')
    );
    expect(result.enabled).toBe(true);
  });

  it('should evaluate principal-scoped Free entitlements without workspace context', async () => {
    const context = createContext();
    const principalSubject = { kind: 'principal', principalId: 'p_free_1' } as const;

    const courses = await evaluator.evaluate({ entitlementKey: EntitlementCatalog.COURSES_LIMIT, subject: principalSubject }, context);
    const exams = await evaluator.evaluate({ entitlementKey: EntitlementCatalog.EXAMS_MONTHLY_LIMIT, subject: principalSubject }, context);
    const team = await evaluator.evaluate({ entitlementKey: EntitlementCatalog.TEAM_FEATURES_ENABLED, subject: principalSubject }, context);
    const whiteLabel = await evaluator.evaluate({ entitlementKey: EntitlementCatalog.WHITE_LABEL_ENABLED, subject: principalSubject }, context);

    expect(courses.enabled).toBe(true);
    expect(exams.enabled).toBe(true);
    expect(team.enabled).toBe(false);
    expect(whiteLabel.enabled).toBe(false);
  });
});
