import { Inject, Injectable } from '@nestjs/common';
import {
  type AuditRecorder,
  type AuditRecordInput,
  type RequestContext,
  type TransactionContext,
} from '@mentrily/service-core';
import { AuditRecordRepository } from '@mentrily/data-platform';

/**
 * Concrete audit recorder implementation.
 *
 * Persists audit records to PostgreSQL via the AuditRecordRepository.
 *
 * Responsibilities:
 * - Accept audit record input from use cases
 * - Enrich from RequestContext (correlation ID, tenant/workspace context)
 * - Persist to durable storage
 * - Never fabricate tenant/workspace values
 * - Never silently swallow persistence errors
 */
@Injectable()
export class PrismaAuditRecorder implements AuditRecorder {
  constructor(@Inject(AuditRecordRepository) private readonly repository: AuditRecordRepository) {}

  /**
   * Record an audit event.
   *
   * @param input - Audit record input (action, actor, target types, metadata)
   * @param context - Request context (provides correlation/request ID and workspace context)
   * @param transaction - Optional transaction context
   * @throws If persistence fails
   */
  async record(
    input: AuditRecordInput,
    context: RequestContext,
    transaction?: TransactionContext,
  ): Promise<void> {
    await this.repository.append(input, context, transaction);
  }
}
