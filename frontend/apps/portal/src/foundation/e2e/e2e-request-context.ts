export const E2E_REQUEST_CONTEXT_STORAGE_KEY = 'mentrily:e2e-request-context';
const E2E_TEST_MODE = process.env.NEXT_PUBLIC_E2E_TEST_MODE;

export interface E2ERequestContextHeaders {
  requestId: string;
  correlationId: string;
  tenantId: string;
  workspaceId: string;
  actorId: string;
}

type BrowserStorageLike = Pick<Storage, 'getItem'>;

function isE2ETestModeEnabled(source?: NodeJS.ProcessEnv): boolean {
  if (source) {
    return source.NEXT_PUBLIC_E2E_TEST_MODE === 'true';
  }

  return E2E_TEST_MODE === 'true';
}

function parseStoredContext(raw: string | null): E2ERequestContextHeaders | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<E2ERequestContextHeaders>;
    if (
      typeof parsed.requestId !== 'string' ||
      typeof parsed.correlationId !== 'string' ||
      typeof parsed.tenantId !== 'string' ||
      typeof parsed.workspaceId !== 'string' ||
      typeof parsed.actorId !== 'string'
    ) {
      return null;
    }

    return {
      requestId: parsed.requestId,
      correlationId: parsed.correlationId,
      tenantId: parsed.tenantId,
      workspaceId: parsed.workspaceId,
      actorId: parsed.actorId,
    };
  } catch {
    return null;
  }
}

function hasGetItem(
  storage: BrowserStorageLike | Storage | undefined,
): storage is BrowserStorageLike {
  return typeof storage?.getItem === 'function';
}

export function readE2ERequestContext(
  storage?: BrowserStorageLike,
  source?: NodeJS.ProcessEnv,
): E2ERequestContextHeaders | null {
  if (!isE2ETestModeEnabled(source)) {
    return null;
  }

  const resolvedStorage =
    storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);

  if (!hasGetItem(resolvedStorage)) {
    return null;
  }

  return parseStoredContext(resolvedStorage.getItem(E2E_REQUEST_CONTEXT_STORAGE_KEY));
}

export function buildE2ERequestHeaders(
  storage?: BrowserStorageLike,
  source?: NodeJS.ProcessEnv,
): HeadersInit | undefined {
  const context = readE2ERequestContext(storage, source);

  if (!context) {
    return undefined;
  }

  return {
    'x-request-id': context.requestId,
    'x-correlation-id': context.correlationId,
    'x-tenant-id': context.tenantId,
    'x-workspace-id': context.workspaceId,
    'x-actor-id': context.actorId,
  };
}
