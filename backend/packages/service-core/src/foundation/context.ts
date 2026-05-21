import { randomUUID } from 'node:crypto';

export interface WorkspaceContext {
  tenantId: string;
  workspaceId: string;
  actorId?: string | undefined;
}

export interface RequestContext {
  requestId: string;
  correlationId: string;
  timestamp: string;
  workspace?: WorkspaceContext;
}

export interface RequestContextHeaders {
  requestIdHeader?: string;
  correlationIdHeader?: string;
  tenantIdHeader?: string;
  workspaceIdHeader?: string;
  actorIdHeader?: string;
}

export function createRequestContextFromHeaders(headers: RequestContextHeaders): RequestContext {
  const requestId = headers.requestIdHeader?.trim() || randomRequestId();
  const correlationId = headers.correlationIdHeader?.trim() || requestId;

  const tenantId = headers.tenantIdHeader?.trim();
  const workspaceId = headers.workspaceIdHeader?.trim();
  const actorId = headers.actorIdHeader?.trim();

  const workspace =
    tenantId && workspaceId
      ? {
          tenantId,
          workspaceId,
          ...(actorId ? { actorId } : {}),
        }
      : undefined;

  const context: RequestContext = {
    requestId,
    correlationId,
    timestamp: new Date().toISOString(),
  };

  if (workspace) {
    context.workspace = workspace;
  }

  return context;
}

function randomRequestId(): string {
  return randomUUID();
}
