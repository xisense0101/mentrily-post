import { RequestContext } from '@mentrily/service-core';

export const TEST_TENANT_ID = '11111111-1111-4111-8111-111111111111';
export const TEST_WORKSPACE_ID = '22222222-2222-4222-8222-222222222222';
export const TEST_ACTOR_ID = '33333333-3333-4333-8333-333333333333';

export function createAssessmentRequestContext(overrides: Partial<RequestContext> = {}): RequestContext {
  const base: RequestContext = {
    requestId: 'req-' + Math.random().toString(36).substring(7),
    correlationId: 'cor-' + Math.random().toString(36).substring(7),
    timestamp: new Date().toISOString(),
    workspace: {
      tenantId: TEST_TENANT_ID,
      workspaceId: TEST_WORKSPACE_ID,
      actorId: TEST_ACTOR_ID,
    },
  };

  return {
    ...base,
    ...overrides
  };
}

export function createAssessmentRequestContextWithoutWorkspace(): RequestContext {
  return {
    requestId: 'req-' + Math.random().toString(36).substring(7),
    correlationId: 'cor-' + Math.random().toString(36).substring(7),
    timestamp: new Date().toISOString(),
  };
}
