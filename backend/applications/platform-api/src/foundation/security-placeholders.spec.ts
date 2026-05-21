import { describe, expect, it } from 'vitest';
import {
  DefaultPermissionEvaluator,
  DefaultEntitlementEvaluator,
} from './default-foundation.providers.js';
import type { RequestContext } from '@mentrily/service-core';

describe('security placeholders (fail-closed)', () => {
  const mockContext: RequestContext = {
    requestId: 'test-id',
    correlationId: 'test-id',
    timestamp: new Date().toISOString(),
  };

  describe('DefaultPermissionEvaluator', () => {
    it('should deny by default (fail-closed)', async () => {
      const evaluator = new DefaultPermissionEvaluator();
      const result = await evaluator.evaluate({ permission: 'any' }, mockContext);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('deny');
    });
  });

  describe('DefaultEntitlementEvaluator', () => {
    it('should disable by default (fail-closed)', async () => {
      const evaluator = new DefaultEntitlementEvaluator();
      const result = await evaluator.evaluate(
        {
          entitlementKey: 'any',
          subject: { kind: 'workspace', workspaceId: 'w_test' },
        },
        mockContext,
      );

      expect(result.enabled).toBe(false);
      expect(result.reason).toContain('disabled');
    });
  });
});
