import { Injectable } from '@nestjs/common';
import { AuditRecorder, AuditRecordInput, RequestContext, TransactionContext } from '@mentrily/service-core';
import { AuditRecordRepository } from './audit-record.repository.js';

@Injectable()
export class PrismaAuditRecorder implements AuditRecorder {
  constructor(private readonly repository: AuditRecordRepository) {}

  async record(input: AuditRecordInput, context: RequestContext, transaction?: TransactionContext): Promise<void> {
    await this.repository.append(input, context, transaction);
  }
}
