import type { Page } from '@playwright/test';
import { randomUUID } from 'crypto';
import {
  E2E_REQUEST_CONTEXT_STORAGE_KEY,
  type E2ERequestContextHeaders,
} from '../../src/foundation/e2e/e2e-request-context';

type AssessmentAttemptE2EContextOverrides = Partial<E2ERequestContextHeaders>;

const DEFAULT_TENANT_ID = '33333333-3333-4333-8333-333333333333';
const DEFAULT_WORKSPACE_ID = '44444444-4444-4444-8444-444444444444';
const DEFAULT_CREATOR_ID = '55555555-5555-4555-8555-555555555555';
const DEFAULT_LEARNER_ID = '77777777-7777-4777-8777-777777777777';

function makeRequestIds(): Pick<E2ERequestContextHeaders, 'requestId' | 'correlationId'> {
  return {
    requestId: randomUUID(),
    correlationId: randomUUID(),
  };
}

async function setStoredContext(page: Page, context: E2ERequestContextHeaders): Promise<void> {
  await page.goto('/');
  await page.evaluate(
    ({ storageKey, value }) => {
      window.localStorage.setItem(storageKey, JSON.stringify(value));
    },
    {
      storageKey: E2E_REQUEST_CONTEXT_STORAGE_KEY,
      value: context,
    },
  );
}

export async function clearAssessmentAttemptE2EContext(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate((storageKey) => {
    window.localStorage.removeItem(storageKey);
  }, E2E_REQUEST_CONTEXT_STORAGE_KEY);
}

export async function setAssessmentAttemptCreatorContext(
  page: Page,
  overrides: AssessmentAttemptE2EContextOverrides = {},
): Promise<E2ERequestContextHeaders> {
  const context: E2ERequestContextHeaders = {
    tenantId: overrides.tenantId ?? DEFAULT_TENANT_ID,
    workspaceId: overrides.workspaceId ?? DEFAULT_WORKSPACE_ID,
    actorId: overrides.actorId ?? DEFAULT_CREATOR_ID,
    ...makeRequestIds(),
    ...overrides,
  };

  await setStoredContext(page, context);
  return context;
}

export async function setAssessmentAttemptLearnerContext(
  page: Page,
  overrides: AssessmentAttemptE2EContextOverrides = {},
): Promise<E2ERequestContextHeaders> {
  const context: E2ERequestContextHeaders = {
    tenantId: overrides.tenantId ?? DEFAULT_TENANT_ID,
    workspaceId: overrides.workspaceId ?? DEFAULT_WORKSPACE_ID,
    actorId: overrides.actorId ?? DEFAULT_LEARNER_ID,
    ...makeRequestIds(),
    ...overrides,
  };

  await setStoredContext(page, context);
  return context;
}

export const assessmentAttemptE2EDefaults = {
  creatorActorId: DEFAULT_CREATOR_ID,
  learnerActorId: DEFAULT_LEARNER_ID,
  tenantId: DEFAULT_TENANT_ID,
  workspaceId: DEFAULT_WORKSPACE_ID,
} as const;
