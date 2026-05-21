import type { Page } from '@playwright/test';
import { randomUUID } from 'crypto';
import {
  E2E_REQUEST_CONTEXT_STORAGE_KEY,
  type E2ERequestContextHeaders,
} from '../../src/foundation/e2e/e2e-request-context';

type AssessmentE2EContextOverrides = Partial<E2ERequestContextHeaders>;

const DEFAULT_TENANT_ID = '33333333-3333-4333-8333-333333333333';
const DEFAULT_WORKSPACE_ID = '44444444-4444-4444-8444-444444444444';
const DEFAULT_CREATOR_ID = '55555555-5555-4555-8555-555555555555';
const DEFAULT_VIEWER_ID = '66666666-6666-4666-8666-666666666666';

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

export async function clearAssessmentE2EContext(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate((storageKey) => {
    window.localStorage.removeItem(storageKey);
  }, E2E_REQUEST_CONTEXT_STORAGE_KEY);
}

export async function setAssessmentCreatorContext(
  page: Page,
  overrides: AssessmentE2EContextOverrides = {},
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

export async function setAssessmentViewerContext(
  page: Page,
  overrides: AssessmentE2EContextOverrides = {},
): Promise<E2ERequestContextHeaders> {
  const context: E2ERequestContextHeaders = {
    tenantId: overrides.tenantId ?? DEFAULT_TENANT_ID,
    workspaceId: overrides.workspaceId ?? DEFAULT_WORKSPACE_ID,
    actorId: overrides.actorId ?? DEFAULT_VIEWER_ID,
    ...makeRequestIds(),
    ...overrides,
  };

  await setStoredContext(page, context);
  return context;
}

export const assessmentE2EDefaults = {
  creatorActorId: DEFAULT_CREATOR_ID,
  viewerActorId: DEFAULT_VIEWER_ID,
  tenantId: DEFAULT_TENANT_ID,
  workspaceId: DEFAULT_WORKSPACE_ID,
} as const;
