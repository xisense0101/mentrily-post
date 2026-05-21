import { AUDIT_RECORDER, OUTBOX_PUBLISHER, TRANSACTION_RUNNER } from '@mentrily/service-core';
import { PrismaTransactionRunner } from '@mentrily/data-platform';
import { PrismaAuditRecorder } from './concrete-adapters/prisma-audit-recorder.adapter.js';
import { PrismaOutboxPublisher } from './concrete-adapters/prisma-outbox-publisher.adapter.js';

/**
 * Concrete durable foundation providers.
 *
 * These use Prisma repositories to persist audit logs and outbox events.
 * Exports the concrete adapters for module wiring.
 *
 * Usage in FoundationModule:
 * ```typescript
 * providers: [
 *   ...concreteFoundationProviders,
 *   ...otherProviders,
 * ]
 * ```
 */
export const concreteFoundationProviders = [
  PrismaAuditRecorder,
  PrismaOutboxPublisher,
  {
    provide: AUDIT_RECORDER,
    useExisting: PrismaAuditRecorder,
  },
  {
    provide: OUTBOX_PUBLISHER,
    useExisting: PrismaOutboxPublisher,
  },
  {
    provide: TRANSACTION_RUNNER,
    useClass: PrismaTransactionRunner,
  },
];
