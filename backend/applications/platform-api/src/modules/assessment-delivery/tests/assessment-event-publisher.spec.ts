import { describe, expect, it, vi } from 'vitest';
import { OutboxPublisher, TransactionContext } from '@mentrily/service-core';
import { AssessmentEventPublisherService } from '../application/services/index.js';
import { createAssessmentCreatedEvent } from '../domain/events/index.js';
import {
  createAssessmentRequestContext,
  TEST_TENANT_ID,
  TEST_WORKSPACE_ID,
} from './assessment-test-fixtures.js';

describe('AssessmentEventPublisherService', () => {
  it('maps domain event to outbox event and preserves context', async () => {
    const outbox: OutboxPublisher = { publish: vi.fn(async () => undefined) };
    const service = new AssessmentEventPublisherService(outbox);
    const context = createAssessmentRequestContext();
    const tx: TransactionContext = { transactionId: 'tx-1', client: {} };

    const domainEvent = createAssessmentCreatedEvent(
      'assessment-1',
      TEST_TENANT_ID,
      TEST_WORKSPACE_ID,
      {
        ownerPrincipalId: 'actor-1',
        purpose: 'QUIZ',
        title: 'Quiz 1',
      },
    );

    await service.publishDomainEvent(domainEvent, context, tx);

    expect(outbox.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'assessment.created',
        eventVersion: 1,
        tenantId: TEST_TENANT_ID,
        workspaceId: TEST_WORKSPACE_ID,
        correlationId: context.correlationId,
        payload: domainEvent.payload as unknown as Record<string, unknown>,
      }),
      context,
      tx,
    );
  });
});
