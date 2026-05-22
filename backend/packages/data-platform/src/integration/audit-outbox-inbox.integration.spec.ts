import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { AuditRecordRepository } from '../audit/audit-record.repository.js';
import { OutboxRepository } from '../outbox/outbox.repository.js';
import { InboxRepository } from '../inbox/inbox.repository.js';
import { truncatePublicSchema } from '@mentrily/testing-toolkit';
import type { RequestContext } from '@mentrily/service-core';

describe('Audit, Outbox, and Inbox Repositories (Integration)', () => {
  let prisma: PrismaClient;
  let auditRepo: AuditRecordRepository;
  let outboxRepo: OutboxRepository;
  let inboxRepo: InboxRepository;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();
    auditRepo = new AuditRecordRepository(prisma as any);
    outboxRepo = new OutboxRepository(prisma as any);
    inboxRepo = new InboxRepository(prisma as any);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await truncatePublicSchema(prisma);
  });

  const createContext = (): RequestContext => ({
    requestId: randomUUID(),
    correlationId: randomUUID(),
    timestamp: new Date().toISOString(),
    workspace: {
      tenantId: randomUUID(),
      workspaceId: randomUUID(),
      actorId: randomUUID(),
    },
  });

  describe('AuditRecordRepository', () => {
    it('should persist audit records with all fields', async () => {
      const ctx = createContext();
      const targetId = randomUUID();
      const actorId = ctx.workspace!.actorId as string;

      const record = await auditRepo.append(
        {
          action: 'test.action',
          actorId,
          targetType: 'test',
          targetId,
          metadata: { foo: 'bar' },
        },
        ctx,
      );

      expect(record.id).toBeDefined();
      const saved = await prisma.auditRecord.findUnique({ where: { id: record.id } });
      expect(saved).toBeDefined();
      expect(saved!.action).toBe('test.action');
      expect(saved!.workspaceId).toBe(ctx.workspace!.workspaceId);
      expect(saved?.tenantId).toBe(ctx.workspace!.tenantId);
      expect(saved?.requestId).toBe(ctx.requestId);
    });
  });

  describe('OutboxRepository', () => {
    it('should persist outbox messages with PENDING status', async () => {
      const ctx = createContext();
      const eventId = randomUUID();

      const record = await outboxRepo.append(
        {
          eventId,
          eventName: 'test.event',
          eventVersion: 1,
          payload: { foo: 'bar' },
          occurredAt: new Date().toISOString(),
          correlationId: ctx.correlationId,
        },
        ctx,
      );

      expect(record.status).toBe('PENDING');
      const saved = await prisma.outboxMessage.findUnique({ where: { eventId } });
      expect(saved?.status).toBe('PENDING');
    });

    it('should return existing record on duplicate eventId', async () => {
      const ctx = createContext();
      const eventId = randomUUID();
      const event = {
        eventId,
        eventName: 'test.event',
        eventVersion: 1,
        payload: { foo: 'bar' },
        occurredAt: new Date().toISOString(),
        correlationId: ctx.correlationId,
      };

      const first = await outboxRepo.append(event, ctx);
      const second = await outboxRepo.append(event, ctx);

      expect(first.id).toBe(second.id);
      const count = await prisma.outboxMessage.count({ where: { eventId } });
      expect(count).toBe(1);
    });

    it('should return the existing row when duplicate eventId payload differs', async () => {
      const ctx = createContext();
      const eventId = randomUUID();

      const first = await outboxRepo.append(
        {
          eventId,
          eventName: 'test.event',
          eventVersion: 1,
          payload: { foo: 'original' },
          occurredAt: new Date().toISOString(),
          correlationId: ctx.correlationId,
        },
        ctx,
      );

      const second = await outboxRepo.append(
        {
          eventId,
          eventName: 'test.event',
          eventVersion: 1,
          payload: { foo: 'changed' },
          occurredAt: new Date().toISOString(),
          correlationId: ctx.correlationId,
        },
        ctx,
      );

      expect(second.id).toBe(first.id);
      expect(await prisma.outboxMessage.count({ where: { eventId } })).toBe(1);
      const saved = await prisma.outboxMessage.findUniqueOrThrow({ where: { eventId } });
      expect(saved.payload).toEqual(first.payload);
    });

    it('should create exactly one row for concurrent duplicate eventId appends', async () => {
      const ctx = createContext();
      const eventId = randomUUID();
      const event = {
        eventId,
        eventName: 'test.concurrent.event',
        eventVersion: 1,
        payload: { foo: 'bar' },
        occurredAt: new Date().toISOString(),
        correlationId: ctx.correlationId,
      };

      const [first, second] = await Promise.all([
        outboxRepo.append(event, ctx),
        outboxRepo.append(event, ctx),
      ]);

      expect(first.id).toBe(second.id);
      expect(await prisma.outboxMessage.count({ where: { eventId } })).toBe(1);

      const saved = await prisma.outboxMessage.findUniqueOrThrow({ where: { eventId } });
      expect(saved.payload).toEqual(event.payload);
    });

    it('should claim pending batch', async () => {
      const ctx = createContext();
      await outboxRepo.append(
        {
          eventId: randomUUID(),
          eventName: 'e1',
          eventVersion: 1,
          payload: {},
          occurredAt: new Date().toISOString(),
          correlationId: ctx.correlationId,
        },
        ctx,
      );

      const batch = await outboxRepo.claimPendingBatch(10);
      expect(batch).toHaveLength(1);
      expect(batch[0]!.status).toBe('PROCESSING');
    });
  });

  describe('InboxRepository', () => {
    it('should handle idempotency correctly', async () => {
      const source = 'test-source';
      const externalEventId = randomUUID();

      const res1 = await inboxRepo.claimOrInsert(source, externalEventId, 'evt', { data: 1 });
      expect(res1.wasClaimed).toBe(true);
      expect(res1.record.status).toBe('RECEIVED');

      const res2 = await inboxRepo.claimOrInsert(source, externalEventId, 'evt', { data: 1 });
      expect(res2.wasClaimed).toBe(false);
      expect(res2.record.id).toBe(res1.record.id);
    });

    it('should claim received batch', async () => {
      const source = 'test-source';
      await inboxRepo.claimOrInsert(source, randomUUID(), 'evt', {});

      const batch = await inboxRepo.claimReceivedBatch(10);
      expect(batch).toHaveLength(1);
      expect(batch[0]!.status).toBe('PROCESSING');
    });
  });
});
