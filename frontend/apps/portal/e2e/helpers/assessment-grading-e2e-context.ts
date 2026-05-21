import type { Page } from '@playwright/test';
import { randomUUID } from 'crypto';
import {
  E2E_REQUEST_CONTEXT_STORAGE_KEY,
  type E2ERequestContextHeaders,
} from '../../src/foundation/e2e/e2e-request-context';

const DEFAULT_TENANT_ID = '93333333-3333-4333-8333-333333333333';
const DEFAULT_WORKSPACE_A = '94444444-4444-4444-8444-444444444444';
const DEFAULT_WORKSPACE_B = '95555555-5555-4555-8555-555555555555';
const DEFAULT_CREATOR_ID = '96666666-6666-4666-8666-666666666666';
const DEFAULT_LEARNER_ID = '97777777-7777-4777-8777-777777777777';

async function setContext(page: Page, context: E2ERequestContextHeaders): Promise<void> {
  await page.goto('/');
  await page.evaluate(
    ({ storageKey, value }) => {
      window.localStorage.setItem(storageKey, JSON.stringify(value));
    },
    { storageKey: E2E_REQUEST_CONTEXT_STORAGE_KEY, value: context },
  );
}

function makeIds() {
  return { requestId: randomUUID(), correlationId: randomUUID() };
}

export async function setAssessmentGradingCreatorContext(
  page: Page,
  workspaceId = DEFAULT_WORKSPACE_A,
): Promise<E2ERequestContextHeaders> {
  const context = {
    tenantId: DEFAULT_TENANT_ID,
    workspaceId,
    actorId: DEFAULT_CREATOR_ID,
    ...makeIds(),
  };
  await setContext(page, context);
  return context;
}

export async function setAssessmentGradingLearnerContext(
  page: Page,
  workspaceId = DEFAULT_WORKSPACE_A,
): Promise<E2ERequestContextHeaders> {
  const context = {
    tenantId: DEFAULT_TENANT_ID,
    workspaceId,
    actorId: DEFAULT_LEARNER_ID,
    ...makeIds(),
  };
  await setContext(page, context);
  return context;
}

export const assessmentGradingE2EDefaults = {
  tenantId: DEFAULT_TENANT_ID,
  workspaceA: DEFAULT_WORKSPACE_A,
  workspaceB: DEFAULT_WORKSPACE_B,
};
