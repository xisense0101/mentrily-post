import { describe, expect, it, vi } from 'vitest';
import { RequestContext, OutboxPublisher } from '@mentrily/service-core';
import { LearningEventPublisherService } from '../application/services/learning-event-publisher.service.js';

describe('LearningEventPublisherService', () => {
  it('maps domain events into outbox messages', async () => {
    const publish = vi.fn(async () => undefined);
    const publisher: OutboxPublisher = { publish };
    const service = new LearningEventPublisherService(publisher);

    const context: RequestContext = {
      requestId: 'req-1',
      correlationId: 'cor-1',
      timestamp: new Date().toISOString(),
      workspace: { tenantId: 'tenant-1', workspaceId: 'workspace-1', actorId: 'actor-1' },
    };

    await service.publishDomainEvent(
      {
        eventName: 'learning.course.created',
        eventVersion: 1,
        occurredAt: new Date('2026-05-12T00:00:00.000Z'),
        tenantId: 'tenant-1',
        workspaceId: 'workspace-1',
        aggregateId: 'course-1',
        payload: { courseId: 'course-1' },
      },
      context,
    );

    expect(publish).toHaveBeenCalledTimes(1);
    const [event] = publish.mock.calls[0] as [Record<string, unknown>];
    expect(event).toMatchObject({
      eventName: 'learning.course.created',
      tenantId: 'tenant-1',
      workspaceId: 'workspace-1',
    });
  });
});
