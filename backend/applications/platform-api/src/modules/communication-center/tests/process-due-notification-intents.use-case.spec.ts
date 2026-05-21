import { describe, expect, it, vi } from 'vitest';
import { ProcessDueNotificationIntentsUseCase } from '../application/use-cases/index.js';
import type { NotificationIntent } from '../domain/entities/index.js';

describe('ProcessDueNotificationIntentsUseCase', () => {
  const makeContext = (actorId = 'system:communication-scheduler') => ({
    requestId: 'req-1',
    correlationId: 'corr-1',
    timestamp: new Date('2026-05-21T10:00:00.000Z').toISOString(),
    workspace: {
      tenantId: 'tenant-1',
      workspaceId: 'workspace-1',
      actorId,
    },
  });

  it('fails when scheduler context is missing', async () => {
    const useCase = new ProcessDueNotificationIntentsUseCase(
      { findDueQueued: vi.fn() } as never,
      { processIntent: vi.fn() } as never,
      { evaluate: vi.fn() } as never,
    );

    await expect(useCase.execute({ context: { requestId: 'r', correlationId: 'c', timestamp: new Date().toISOString() } })).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
  });

  it('forbids non-system actors', async () => {
    const useCase = new ProcessDueNotificationIntentsUseCase(
      { findDueQueued: vi.fn() } as never,
      { processIntent: vi.fn() } as never,
      { evaluate: vi.fn() } as never,
    );

    await expect(useCase.execute({ context: makeContext('creator-1') })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  it('returns an empty summary when no due intents exist', async () => {
    const findDueQueued = vi.fn(async () => []);
    const processIntent = vi.fn();
    const evaluate = vi.fn(async () => ({ allowed: true }));
    const useCase = new ProcessDueNotificationIntentsUseCase(
      { findDueQueued } as never,
      { processIntent } as never,
      { evaluate } as never,
    );

    const result = await useCase.execute({ context: makeContext(), now: new Date('2026-05-21T10:00:00.000Z') });

    expect(result).toEqual({
      processed: 0,
      dispatched: 0,
      failed: 0,
      skipped: 0,
      results: [],
    });
    expect(findDueQueued).toHaveBeenCalledOnce();
    expect(processIntent).not.toHaveBeenCalled();
    expect(evaluate).toHaveBeenCalledOnce();
  });

  it('aggregates scheduler results deterministically', async () => {
    const intents = [{ id: 'intent-1' }, { id: 'intent-2' }, { id: 'intent-3' }] as NotificationIntent[];
    const useCase = new ProcessDueNotificationIntentsUseCase(
      { findDueQueued: vi.fn(async () => intents) } as never,
      {
        processIntent: vi
          .fn()
          .mockResolvedValueOnce({ intentId: 'intent-1', status: 'DISPATCHED', deliveryAttemptId: 'attempt-1' })
          .mockResolvedValueOnce({ intentId: 'intent-2', status: 'FAILED', errorCode: 'NOOP_PROVIDER' })
          .mockResolvedValueOnce({ intentId: 'intent-3', status: 'SKIPPED' }),
      } as never,
      { evaluate: vi.fn(async () => ({ allowed: true })) } as never,
    );

    const result = await useCase.execute({
      context: makeContext('internal:communication-scheduler'),
      workspaceId: 'workspace-1',
      limit: 50,
      now: new Date('2026-05-21T10:00:00.000Z'),
    });

    expect(result).toEqual({
      processed: 3,
      dispatched: 1,
      failed: 1,
      skipped: 1,
      results: [
        { intentId: 'intent-1', status: 'DISPATCHED', deliveryAttemptId: 'attempt-1' },
        { intentId: 'intent-2', status: 'FAILED', errorCode: 'NOOP_PROVIDER' },
        { intentId: 'intent-3', status: 'SKIPPED' },
      ],
    });
  });
});
