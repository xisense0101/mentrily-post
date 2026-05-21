import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';
import { AuditRecordRepository } from './audit/audit-record.repository.js';
import { OutboxRepository } from './outbox/outbox.repository.js';
import { InboxRepository } from './inbox/inbox.repository.js';
import { PrismaTransactionRunner } from './transactions/prisma-transaction-runner.js';
import { PrismaAuditRecorder } from './audit/prisma-audit-recorder.js';
import { PrismaOutboxPublisher } from './outbox/prisma-outbox-publisher.js';
import { AUDIT_RECORDER, OUTBOX_PUBLISHER, TRANSACTION_RUNNER } from '@mentrily/service-core';

@Global()
@Module({
  providers: [
    PrismaService,
    AuditRecordRepository,
    OutboxRepository,
    InboxRepository,
    PrismaTransactionRunner,
    { provide: TRANSACTION_RUNNER, useClass: PrismaTransactionRunner },
    { provide: AUDIT_RECORDER, useClass: PrismaAuditRecorder },
    { provide: OUTBOX_PUBLISHER, useClass: PrismaOutboxPublisher },
  ],
  exports: [
    PrismaService,
    AuditRecordRepository,
    OutboxRepository,
    InboxRepository,
    TRANSACTION_RUNNER,
    AUDIT_RECORDER,
    OUTBOX_PUBLISHER,
  ],
})
export class DataPlatformModule {}
export { PrismaService };
