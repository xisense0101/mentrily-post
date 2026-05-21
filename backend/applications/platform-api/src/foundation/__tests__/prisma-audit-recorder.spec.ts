import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { RequestContext, AuditRecordInput } from '@mentrily/service-core';
import { PrismaAuditRecorder } from '../concrete-adapters/prisma-audit-recorder.adapter';

describe('PrismaAuditRecorder', () => {
  let recorder: PrismaAuditRecorder;
  let repositoryMock: any;

  beforeEach(() => {
    repositoryMock = {
      append: vi.fn(),
    };
    recorder = new PrismaAuditRecorder(repositoryMock);
  });

  it('delegates record() to repository.append()', async () => {
    const input: AuditRecordInput = {
      action: 'workspace.created',
      actorId: 'actor-123',
      targetType: 'workspace',
      targetId: 'ws-456',
      metadata: { plan: 'pro' },
    };

    const context: RequestContext = {
      requestId: 'req-001',
      correlationId: 'corr-001',
      timestamp: new Date().toISOString(),
      workspace: {
        tenantId: 'tenant-001',
        workspaceId: 'ws-456',
        actorId: 'actor-123',
      },
    };

    const mockAuditRecord = {
      id: 'audit-1',
      action: input.action,
      actorId: input.actorId,
      targetType: input.targetType,
      targetId: input.targetId,
      tenantId: 'tenant-001',
      workspaceId: 'ws-456',
      requestId: context.requestId,
      correlationId: context.correlationId,
      metadata: input.metadata,
      occurredAt: new Date(),
      createdAt: new Date(),
    };

    repositoryMock.append.mockResolvedValue(mockAuditRecord);

    await recorder.record(input, context);

    expect(repositoryMock.append).toHaveBeenCalledWith(input, context, undefined);
  });

  it('propagates repository errors', async () => {
    const input: AuditRecordInput = {
      action: 'test.action',
      actorId: 'actor-123',
      targetType: 'test',
      targetId: 'test-1',
    };

    const context: RequestContext = {
      requestId: 'req-001',
      correlationId: 'corr-001',
      timestamp: new Date().toISOString(),
    };

    const dbError = new Error('Database connection failed');
    repositoryMock.append.mockRejectedValue(dbError);

    await expect(recorder.record(input, context)).rejects.toThrow('Database connection failed');
  });

  it('passes transaction context to repository', async () => {
    const input: AuditRecordInput = { action: 'test', targetType: 'test' };
    const context: RequestContext = {
      requestId: 'req',
      correlationId: 'corr',
      timestamp: new Date().toISOString(),
    };
    const transaction = { transactionId: 'tx-id', client: {} };

    await recorder.record(input, context, transaction as any);

    expect(repositoryMock.append).toHaveBeenCalledWith(input, context, transaction);
  });
});
