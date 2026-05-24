import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService, PrismaTransactionRunner } from '@mentrily/data-platform';
import { truncatePublicSchema } from '@mentrily/testing-toolkit';
import {
  FixtureNotificationDeliveryProvider,
  NotificationDeliveryProviderFactory,
  NoopNotificationDeliveryProvider,
  PrismaNotificationDeliveryAttemptRepository,
  PrismaNotificationIntentRepository,
  ReservedEmailNotificationDeliveryProvider,
  ReservedSmsNotificationDeliveryProvider,
} from '../infrastructure/index.js';
import { NotificationIntent } from '../domain/entities/index.js';
import {
  NotificationRecipientPolicyService,
  NotificationSchedulerPolicyService,
} from '../domain/services/index.js';
import {
  NotificationSchedulerService,
  ProcessDueNotificationIntentsUseCase,
} from '../application/index.js';
import { getSafeNotificationProviderConfig } from '../application/support/index.js';

describe('Communication scheduler (integration)', () => {
  let prisma: PrismaService;
  let intentRepo: PrismaNotificationIntentRepository;
  let attemptRepo: PrismaNotificationDeliveryAttemptRepository;
  let transactionRunner: PrismaTransactionRunner;
  let fixtureScheduler: NotificationSchedulerService;
  let noopScheduler: NotificationSchedulerService;
  let reservedEmailDisabledScheduler: NotificationSchedulerService;
  let permissionEvaluator: { evaluate: ReturnType<typeof vi.fn> };

  const auditRecorder = { record: vi.fn(async () => undefined) };
  const eventPublisher = { publishDomainEvent: vi.fn(async () => undefined) };
  const policy = new NotificationSchedulerPolicyService();
  const recipientPolicy = new NotificationRecipientPolicyService();
  const now = new Date('2026-05-21T10:00:00.000Z');
  const context = {
    requestId: 'req-1',
    correlationId: 'corr-1',
    timestamp: now.toISOString(),
    workspace: {
      tenantId: '22222222-2222-4222-8222-222222222222',
      workspaceId: '33333333-3333-4333-8333-333333333333',
      actorId: 'system:communication-scheduler',
    },
  };

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    intentRepo = new PrismaNotificationIntentRepository(prisma);
    attemptRepo = new PrismaNotificationDeliveryAttemptRepository(prisma);
    transactionRunner = new PrismaTransactionRunner(prisma);

    fixtureScheduler = new NotificationSchedulerService(
      intentRepo,
      attemptRepo,
      new NotificationDeliveryProviderFactory(
        { ...getSafeNotificationProviderConfig(), defaultProvider: 'FIXTURE' },
        true,
        new NoopNotificationDeliveryProvider(),
        new FixtureNotificationDeliveryProvider(),
        new ReservedEmailNotificationDeliveryProvider(getSafeNotificationProviderConfig(), true),
        new ReservedSmsNotificationDeliveryProvider(getSafeNotificationProviderConfig(), true),
      ),
      recipientPolicy,
      policy,
      transactionRunner,
      auditRecorder,
      eventPublisher as never,
    );
    noopScheduler = new NotificationSchedulerService(
      intentRepo,
      attemptRepo,
      new NotificationDeliveryProviderFactory(
        getSafeNotificationProviderConfig(),
        false,
        new NoopNotificationDeliveryProvider(),
        new FixtureNotificationDeliveryProvider(),
        new ReservedEmailNotificationDeliveryProvider(getSafeNotificationProviderConfig(), false),
        new ReservedSmsNotificationDeliveryProvider(getSafeNotificationProviderConfig(), false),
      ),
      recipientPolicy,
      policy,
      transactionRunner,
      auditRecorder,
      eventPublisher as never,
    );
    reservedEmailDisabledScheduler = new NotificationSchedulerService(
      intentRepo,
      attemptRepo,
      new NotificationDeliveryProviderFactory(
        getSafeNotificationProviderConfig(),
        true,
        new NoopNotificationDeliveryProvider(),
        new FixtureNotificationDeliveryProvider(),
        new ReservedEmailNotificationDeliveryProvider(getSafeNotificationProviderConfig(), true),
        new ReservedSmsNotificationDeliveryProvider(getSafeNotificationProviderConfig(), true),
      ),
      recipientPolicy,
      policy,
      transactionRunner,
      auditRecorder,
      eventPublisher as never,
    );
    permissionEvaluator = {
      evaluate: vi.fn(async () => ({ allowed: true })),
    };
  });

  beforeEach(async () => {
    auditRecorder.record.mockClear();
    eventPublisher.publishDomainEvent.mockClear();
    permissionEvaluator.evaluate.mockClear();
    await truncatePublicSchema(prisma);
  });

  async function createIntent(
    overrides: Partial<ConstructorParameters<typeof NotificationIntent>[0]> = {},
  ) {
    const intent = new NotificationIntent({
      id: overrides.id ?? '11111111-1111-4111-8111-111111111111',
      tenantId: '22222222-2222-4222-8222-222222222222',
      workspaceId: overrides.workspaceId ?? '33333333-3333-4333-8333-333333333333',
      channel: overrides.channel ?? 'EMAIL',
      recipient: overrides.recipient ?? { email: 'user@example.com' },
      subject: overrides.subject ?? 'Subject',
      body: overrides.body ?? 'Body',
      priority: overrides.priority ?? 'NORMAL',
      status: overrides.status ?? 'QUEUED',
      provider: overrides.provider ?? 'FIXTURE',
      scheduledFor: overrides.scheduledFor,
      queuedAt: overrides.queuedAt ?? new Date('2026-05-21T09:00:00.000Z'),
      dispatchedAt: overrides.dispatchedAt,
      failedAt: overrides.failedAt,
      cancelledAt: overrides.cancelledAt,
      failureReason: overrides.failureReason,
      metadata: overrides.metadata ?? {},
      createdByPrincipalId: '44444444-4444-4444-8444-444444444444',
      createdAt: overrides.createdAt ?? new Date('2026-05-21T09:00:00.000Z'),
      updatedAt: overrides.updatedAt ?? new Date('2026-05-21T09:00:00.000Z'),
      templateId: overrides.templateId,
    });

    return intentRepo.save(intent);
  }

  it('returns only due queued intents with workspace filtering', async () => {
    const dueQueued = await createIntent({ id: '11111111-1111-4111-8111-111111111111' });
    await createIntent({
      id: '22222222-2222-4222-8222-222222222222',
      scheduledFor: new Date('2026-05-21T11:00:00.000Z'),
    });
    await createIntent({
      id: '33333333-3333-4333-8333-333333333333',
      status: 'DRAFT',
    });
    await createIntent({
      id: '44444444-4444-4444-8444-444444444444',
      workspaceId: '55555555-5555-4555-8555-555555555555',
    });

    const results = await intentRepo.findDueQueued({
      workspaceId: dueQueued.workspaceId,
      limit: 10,
      now,
    });

    expect(results.map((intent) => intent.id)).toEqual([dueQueued.id]);
  });

  it('dispatches fixture-backed intents and persists delivery attempts', async () => {
    const intent = await createIntent();
    const useCase = new ProcessDueNotificationIntentsUseCase(
      intentRepo,
      fixtureScheduler,
      permissionEvaluator as never,
    );

    const result = await useCase.execute({ context, workspaceId: intent.workspaceId, now });

    expect(result).toMatchObject({
      processed: 1,
      dispatched: 1,
      failed: 0,
      skipped: 0,
    });

    const savedIntent = await intentRepo.findById(intent.id);
    const attempts = await attemptRepo.findByIntentId(intent.id);
    expect(savedIntent?.status).toBe('DISPATCHED');
    expect(attempts).toHaveLength(1);
    expect(attempts[0]?.status).toBe('SUCCEEDED');
    expect(attempts[0]?.attemptNumber).toBe(1);
  });

  it('marks noop delivery as failed without any real provider integration', async () => {
    const intent = await createIntent({ provider: 'NOOP' });
    const useCase = new ProcessDueNotificationIntentsUseCase(
      intentRepo,
      noopScheduler,
      permissionEvaluator as never,
    );

    const result = await useCase.execute({ context, workspaceId: intent.workspaceId, now });

    expect(result).toMatchObject({
      processed: 1,
      dispatched: 0,
      failed: 1,
      skipped: 0,
    });

    const savedIntent = await intentRepo.findById(intent.id);
    const attempts = await attemptRepo.findByIntentId(intent.id);
    expect(savedIntent?.status).toBe('FAILED');
    expect(savedIntent?.failureReason).toContain('disabled');
    expect(attempts[0]?.status).toBe('FAILED');
  });

  it('marks reserved email delivery as provider disabled when live delivery is not enabled', async () => {
    const intent = await createIntent({ provider: 'RESERVED_EMAIL' });
    const useCase = new ProcessDueNotificationIntentsUseCase(
      intentRepo,
      reservedEmailDisabledScheduler,
      permissionEvaluator as never,
    );

    const result = await useCase.execute({ context, workspaceId: intent.workspaceId, now });

    expect(result).toMatchObject({
      processed: 1,
      dispatched: 0,
      failed: 1,
      results: [{ intentId: intent.id, status: 'FAILED', errorCode: 'PROVIDER_DISABLED' }],
    });

    const attempts = await attemptRepo.findByIntentId(intent.id);
    expect(attempts[0]?.errorCode).toBe('PROVIDER_DISABLED');
    expect(attempts[0]?.metadata).toMatchObject({ safe: true, scheduler: true });
    expect(JSON.stringify(attempts[0]?.metadata ?? {})).not.toContain('API_KEY');
  });

  it('continues a batch when one intent fails', async () => {
    const failingIntent = await createIntent({
      id: '11111111-1111-4111-8111-111111111111',
      queuedAt: new Date('2026-05-21T09:00:00.000Z'),
      createdAt: new Date('2026-05-21T09:00:00.000Z'),
      metadata: { fixtureResult: 'FAILED' },
    });
    const succeedingIntent = await createIntent({
      id: '22222222-2222-4222-8222-222222222222',
      queuedAt: new Date('2026-05-21T09:01:00.000Z'),
      createdAt: new Date('2026-05-21T09:01:00.000Z'),
    });
    const useCase = new ProcessDueNotificationIntentsUseCase(
      intentRepo,
      fixtureScheduler,
      permissionEvaluator as never,
    );

    const dueIntents = await intentRepo.findDueQueued({
      workspaceId: failingIntent.workspaceId,
      limit: 10,
      now,
    });
    expect(dueIntents).toHaveLength(2);

    const result = await useCase.execute({ context, workspaceId: failingIntent.workspaceId, now });

    expect(result.processed).toBe(2);
    expect(result.failed).toBe(1);
    expect(result.dispatched).toBe(1);
    expect((await intentRepo.findById(failingIntent.id))?.status).toBe('FAILED');
    expect((await intentRepo.findById(succeedingIntent.id))?.status).toBe('DISPATCHED');
  });

  it('skips invalid recipients instead of delivering them', async () => {
    const intent = await createIntent({
      recipient: {},
      channel: 'EMAIL',
    });
    const useCase = new ProcessDueNotificationIntentsUseCase(
      intentRepo,
      fixtureScheduler,
      permissionEvaluator as never,
    );

    const result = await useCase.execute({ context, workspaceId: intent.workspaceId, now });

    expect(result).toMatchObject({
      processed: 1,
      dispatched: 0,
      failed: 0,
      skipped: 1,
    });
    expect(await attemptRepo.countByIntentId(intent.id)).toBe(0);
    expect((await intentRepo.findById(intent.id))?.status).toBe('QUEUED');
  });

  it('does not dispatch an already successful intent twice', async () => {
    const intent = await createIntent();
    const useCase = new ProcessDueNotificationIntentsUseCase(
      intentRepo,
      fixtureScheduler,
      permissionEvaluator as never,
    );

    const first = await useCase.execute({ context, workspaceId: intent.workspaceId, now });
    const second = await useCase.execute({ context, workspaceId: intent.workspaceId, now });

    expect(first.dispatched).toBe(1);
    expect(second.processed).toBe(0);
    expect(await attemptRepo.countByIntentId(intent.id)).toBe(1);
  });

  it('avoids duplicate dispatch under concurrent scheduler runs', async () => {
    const intent = await createIntent();
    const useCase = new ProcessDueNotificationIntentsUseCase(
      intentRepo,
      fixtureScheduler,
      permissionEvaluator as never,
    );

    const [first, second] = await Promise.all([
      useCase.execute({ context, workspaceId: intent.workspaceId, now }),
      useCase.execute({ context, workspaceId: intent.workspaceId, now }),
    ]);

    expect(first.dispatched + second.dispatched).toBe(1);
    expect(await attemptRepo.countByIntentId(intent.id)).toBe(1);
    expect((await intentRepo.findById(intent.id))?.status).toBe('DISPATCHED');
  });

  it('schedules retry with exponential backoff on retryable delivery failures', async () => {
    const intent = await createIntent({
      metadata: { fixtureResult: 'RETRYABLE' },
    });
    const useCase = new ProcessDueNotificationIntentsUseCase(
      intentRepo,
      fixtureScheduler,
      permissionEvaluator as never,
    );

    const result = await useCase.execute({ context, workspaceId: intent.workspaceId, now });

    expect(result.processed).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.skipped).toBe(1);

    const updated = await intentRepo.findById(intent.id);
    expect(updated?.status).toBe('QUEUED');
    expect(updated?.scheduledFor).toBeDefined();
    expect(updated?.scheduledFor?.getTime()).toBe(now.getTime() + 1000);
    expect(await attemptRepo.countByIntentId(intent.id)).toBe(1);
  });
});
