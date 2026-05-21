import type { Page } from '@playwright/test';
import type { E2ERequestContextHeaders } from '../../src/foundation/e2e/e2e-request-context';
import { E2E_REQUEST_CONTEXT_STORAGE_KEY } from '../../src/foundation/e2e/e2e-request-context';

function buildContext(actorId: string, workspaceId: string): E2ERequestContextHeaders {
  const stamp = Date.now().toString();
  return {
    requestId: `req-${stamp}-${actorId}`,
    correlationId: `corr-${stamp}-${actorId}`,
    tenantId: '83333333-3333-4333-8333-333333333333',
    workspaceId,
    actorId,
  };
}

async function setPageContext(
  page: Page,
  context: E2ERequestContextHeaders,
): Promise<E2ERequestContextHeaders> {
  await page.addInitScript(
    ([key, value]) => {
      window.localStorage.setItem(key, JSON.stringify(value));
    },
    [E2E_REQUEST_CONTEXT_STORAGE_KEY, context] as const,
  );
  await page.goto('/dashboard');
  await page.evaluate(
    ([key, value]) => {
      window.localStorage.setItem(key, JSON.stringify(value));
    },
    [E2E_REQUEST_CONTEXT_STORAGE_KEY, context] as const,
  );
  return context;
}

export function setAssessmentResultCreatorContext(
  page: Page,
  workspaceId = '84444444-4444-4444-8444-444444444444',
) {
  return setPageContext(page, buildContext('85555555-5555-4555-8555-555555555555', workspaceId));
}

export function setAssessmentResultLearnerContext(
  page: Page,
  workspaceId = '84444444-4444-4444-8444-444444444444',
) {
  return setPageContext(page, buildContext('86666666-6666-4666-8666-666666666666', workspaceId));
}
