import { describe, expect, it } from 'vitest';
import { createRequestContextFromHeaders } from '../context.js';

describe('createRequestContextFromHeaders', () => {
  it('uses provided request and correlation IDs', () => {
    const context = createRequestContextFromHeaders({
      requestIdHeader: 'req-123',
      correlationIdHeader: 'corr-456',
      tenantIdHeader: 'tenant-a',
      workspaceIdHeader: 'workspace-a',
      actorIdHeader: 'actor-a',
    });

    expect(context.requestId).toBe('req-123');
    expect(context.correlationId).toBe('corr-456');
    expect(context.workspace).toEqual({
      tenantId: 'tenant-a',
      workspaceId: 'workspace-a',
      actorId: 'actor-a',
    });
  });

  it('generates request ID and defaults correlation ID to request ID', () => {
    const context = createRequestContextFromHeaders({});

    expect(context.requestId).toBeTruthy();
    expect(context.correlationId).toBe(context.requestId);
    expect(context.workspace).toBeUndefined();
  });
});
