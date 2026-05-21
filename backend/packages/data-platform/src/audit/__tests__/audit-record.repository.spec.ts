import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { RequestContext } from '@mentrily/service-core';
import { AuditRecordRepository } from '../audit-record.repository';
import type { PrismaService } from '../../prisma.service';

// Mock setup - in a real scenario, you'd use @nestjs/testing TestingModule
// For now, we'll document the expected test behavior

describe('AuditRecordRepository', () => {
  let repository: AuditRecordRepository;
  let prismaMock: {
    auditRecord: {
      create: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    prismaMock = {
      auditRecord: {
        create: vi.fn(),
      },
    };
    repository = new AuditRecordRepository(prismaMock as unknown as PrismaService);
  });

  it('persists all expected fields from input + context', async () => {
    const input = {
      action: 'workspace.member.added',
      actorId: 'actor-123',
      targetType: 'workspace_member',
      targetId: 'member-456',
      metadata: { reason: 'invited' },
    };

    const context: RequestContext = {
      requestId: 'req-789',
      correlationId: 'corr-xyz',
      timestamp: new Date().toISOString(),
      workspace: {
        tenantId: 'tenant-001',
        workspaceId: 'ws-001',
        actorId: 'actor-123',
      },
    };

    const mockRecord = {
      id: 'audit-1',
      action: input.action,
      actorId: input.actorId,
      targetType: input.targetType,
      targetId: input.targetId,
      tenantId: context.workspace?.tenantId,
      workspaceId: context.workspace?.workspaceId,
      requestId: context.requestId,
      correlationId: context.correlationId,
      metadata: input.metadata,
      occurredAt: new Date(),
      createdAt: new Date(),
    };

    prismaMock.auditRecord.create.mockResolvedValue(mockRecord);

    const result = await repository.append(input, context);

    expect(prismaMock.auditRecord.create).toHaveBeenCalledWith({
      data: {
        action: input.action,
        actorId: input.actorId,
        targetType: input.targetType,
        targetId: input.targetId,
        tenantId: context.workspace?.tenantId,
        workspaceId: context.workspace?.workspaceId,
        requestId: context.requestId,
        correlationId: context.correlationId,
        metadata: input.metadata,
        occurredAt: expect.any(Date),
      },
    });

    expect(result.id).toBe('audit-1');
    expect(result.action).toBe('workspace.member.added');
    expect(result.actorId).toBe('actor-123');
    expect(result.correlationId).toBe('corr-xyz');
  });

  it('preserves null actor for system actions', async () => {
    const input = {
      action: 'system.garbage_collection',
      targetType: 'workspace',
    };

    const context: RequestContext = {
      requestId: 'req-sys',
      correlationId: 'corr-sys',
      timestamp: new Date().toISOString(),
      workspace: {
        tenantId: 'tenant-001',
        workspaceId: 'ws-001',
        actorId: 'actor-123',
      },
    };

    const mockRecord = {
      id: 'audit-2',
      action: input.action,
      actorId: null,
      targetType: input.targetType,
      targetId: null,
      tenantId: context.workspace?.tenantId,
      workspaceId: context.workspace?.workspaceId,
      requestId: context.requestId,
      correlationId: context.correlationId,
      metadata: null,
      occurredAt: new Date(),
      createdAt: new Date(),
    };

    prismaMock.auditRecord.create.mockResolvedValue(mockRecord);

    const result = await repository.append(input, context);

    expect(result.actorId).toBeNull();
    expect(result.targetId).toBeNull();
  });

  it('never fabricates tenant/workspace - uses only context', async () => {
    const input = {
      action: 'principal.account.created',
      actorId: 'actor-123',
      targetType: 'principal',
      targetId: 'principal-456',
    };

    // Context without workspace (principal-scoped event)
    const context: RequestContext = {
      requestId: 'req-principal',
      correlationId: 'corr-principal',
      timestamp: new Date().toISOString(),
      // No workspace info
    };

    const mockRecord = {
      id: 'audit-3',
      action: input.action,
      actorId: input.actorId,
      targetType: input.targetType,
      targetId: input.targetId,
      tenantId: null,
      workspaceId: null,
      requestId: context.requestId,
      correlationId: context.correlationId,
      metadata: null,
      occurredAt: new Date(),
      createdAt: new Date(),
    };

    prismaMock.auditRecord.create.mockResolvedValue(mockRecord);

    const result = await repository.append(input, context);

    expect(prismaMock.auditRecord.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: null,
        workspaceId: null,
      }),
    });

    expect(result.tenantId).toBeNull();
    expect(result.workspaceId).toBeNull();
  });

  it('uses transaction client when provided', async () => {
    const input = {
      action: 'test.action',
      targetType: 'test',
    };
    const context: RequestContext = { requestId: 'req', correlationId: 'corr', timestamp: new Date().toISOString() };
    const txClient = {
      auditRecord: {
        create: vi.fn().mockResolvedValue({ id: 'tx-1', occurredAt: new Date(), createdAt: new Date() }),
      },
    };
    const transaction = { transactionId: 'tx-id', client: txClient };

    await repository.append(input, context, transaction as any);

    expect(txClient.auditRecord.create).toHaveBeenCalled();
    expect(prismaMock.auditRecord.create).not.toHaveBeenCalled();
  });
});
