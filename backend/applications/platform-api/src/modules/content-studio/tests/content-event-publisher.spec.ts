import { describe, expect, it, vi } from 'vitest';
import { OutboxPublisher } from '@mentrily/service-core';
import { ContentEventPublisherService } from '../application/services/index.js';
import { createContentRequestContext } from './content-test-fixtures.js';

describe('ContentEventPublisherService', () => {
  it('maps content domain event to outbox event and forwards transaction', async () => {
    const publish = vi.fn(async () => undefined);
    const outbox: OutboxPublisher = { publish };
    const service = new ContentEventPublisherService(outbox);
    const context = createContentRequestContext();
    const tx = { transactionId: 'tx-1', client: {} };

    await service.publishDomainEvent(
      {
        eventName: 'content.document.created',
        eventVersion: 1,
        occurredAt: new Date('2026-05-13T00:00:00.000Z'),
        tenantId: 'tenant-1',
        workspaceId: 'workspace-1',
        aggregateId: 'document-1',
        payload: { documentId: 'document-1' },
      },
      context,
      tx,
    );

    expect(publish).toHaveBeenCalledTimes(1);
    const [event, forwardedContext, forwardedTx] = publish.mock.calls[0]!;
    expect(event).toMatchObject({
      eventName: 'content.document.created',
      eventVersion: 1,
      tenantId: 'tenant-1',
      workspaceId: 'workspace-1',
      correlationId: context.correlationId,
    });
    expect(event.idempotencyKey).toContain('content.document.created:document-1:1:');
    expect(forwardedContext).toBe(context);
    expect(forwardedTx).toBe(tx);
  });
});
