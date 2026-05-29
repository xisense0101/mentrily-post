import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import type {
  AuditRecord,
  AuditRecordInput,
  RequestContext,
  TransactionContext,
} from '@mentrily/service-core';
import { Prisma } from '@prisma/client';
import type { AuditRecord as PrismaAuditRecord } from '@prisma/client';
import { getPrismaClient } from '../transactions/transaction-client.js';

/**
 * Database repository for durable audit records.
 *
 * Responsibilities:
 * - Persist audit records following the AuditRecord contract
 * - Ensure all required fields (including context enrichment) are persisted
 * - Never fabricate tenant/workspace values; only persist what is provided
 */
@Injectable()
export class AuditRecordRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * Append a new audit record.
   *
   * Enriches the input with context metadata (requestId, correlationId, workspaceId, tenantId)
   * and persists it durably.
   *
   * @param input - Audit record input (action, actor, target, metadata)
   * @param context - Request context containing correlation metadata
   * @param transaction - Optional transaction context
   * @returns The persisted audit record
   */
  async append(
    input: AuditRecordInput,
    context: RequestContext,
    transaction?: TransactionContext,
  ): Promise<AuditRecord> {
    const client = getPrismaClient(this.prisma, transaction);
    const record = await client.auditRecord.create({
      data: {
        action: input.action,
        actorId: input.actorId ?? null,
        targetType: input.targetType,
        targetId: input.targetId ?? null,
        tenantId: context.workspace?.tenantId ?? null,
        workspaceId: context.workspace?.workspaceId ?? null,
        requestId: context.requestId ?? null,
        correlationId: context.correlationId ?? null,
        metadata: (input.metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        occurredAt: new Date(),
      },
    });

    return this.mapToContract(record);
  }

  private mapToContract(record: PrismaAuditRecord): AuditRecord {
    return {
      id: record.id,
      action: record.action,
      actorId: record.actorId,
      targetType: record.targetType,
      targetId: record.targetId,
      tenantId: record.tenantId,
      workspaceId: record.workspaceId,
      requestId: record.requestId,
      correlationId: record.correlationId,
      metadata: record.metadata as Record<string, unknown> | null,
      occurredAt: record.occurredAt,
      createdAt: record.createdAt,
    };
  }
}
