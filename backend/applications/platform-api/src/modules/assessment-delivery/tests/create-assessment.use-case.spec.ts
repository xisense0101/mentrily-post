import { describe, expect, it, vi } from 'vitest';
import {
  AuditRecorder,
  OutboxPublisher,
  PermissionEvaluator,
  TransactionContext,
  TransactionRunner,
} from '@mentrily/service-core';
import { AssessmentRepository } from '../domain/repositories/index.js';
import { MediaAssetRepository } from '../../media-library/domain/repositories/index.js';
import { AssessmentEventPublisherService } from '../application/services/index.js';
import { CreateAssessmentUseCase } from '../application/use-cases/index.js';
import { Assessment } from '../domain/index.js';
import { createAssessmentRequestContext, TEST_TENANT_ID, TEST_WORKSPACE_ID } from './assessment-test-fixtures.js';

function createRepo(): AssessmentRepository {
  return {
    save: vi.fn(async (assessment: Assessment) => assessment),
    findById: vi.fn(async () => null),
    listByWorkspace: vi.fn(async () => []),
    listByPurpose: vi.fn(async () => []),
  } as unknown as AssessmentRepository;
}

function createPermissionEvaluator(allowed: boolean): PermissionEvaluator {
  return {
    evaluate: vi.fn(async () => ({ allowed })),
  };
}

function createTransactionRunner(tx: TransactionContext): TransactionRunner {
  return {
    run: vi.fn(async (operation) => operation(tx)),
  };
}

function createAuditRecorder(): AuditRecorder {
  return {
    record: vi.fn(async () => undefined),
  };
}

function createEventPublisher(outbox: OutboxPublisher = { publish: vi.fn(async () => undefined) }) {
  return {
    outbox,
    service: new AssessmentEventPublisherService(outbox),
  };
}

function createMediaAssetRepository(): MediaAssetRepository {
  return {
    findById: vi.fn(async () => null),
    list: vi.fn(async () => []),
    save: vi.fn(async (asset) => asset),
  } as unknown as MediaAssetRepository;
}

describe('CreateAssessmentUseCase', () => {
  it('fails without workspace context', async () => {
    const repo = createRepo();
    const permissions = createPermissionEvaluator(true);
    const transactions = createTransactionRunner({ transactionId: 'tx-1', client: {} });
    const audit = createAuditRecorder();
    const { service } = createEventPublisher();
    const useCase = new CreateAssessmentUseCase(
      repo,
      createMediaAssetRepository(),
      permissions,
      transactions,
      audit,
      service,
    );

    await expect(
      useCase.execute(
        { requestId: 'req', correlationId: 'cor', timestamp: new Date().toISOString() },
        { title: 'Quiz', purpose: 'QUIZ' },
      ),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('permission denial prevents transaction', async () => {
    const repo = createRepo();
    const permissions = createPermissionEvaluator(false);
    const transactions = createTransactionRunner({ transactionId: 'tx-1', client: {} });
    const audit = createAuditRecorder();
    const { service } = createEventPublisher();
    const useCase = new CreateAssessmentUseCase(
      repo,
      createMediaAssetRepository(),
      permissions,
      transactions,
      audit,
      service,
    );

    await expect(
      useCase.execute(createAssessmentRequestContext(), { title: 'Quiz', purpose: 'QUIZ' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(transactions.run).not.toHaveBeenCalled();
  });

  it('successful create uses context tenant/workspace and emits audit/outbox in transaction', async () => {
    const tx: TransactionContext = { transactionId: 'tx-1', client: {} };
    const repo = createRepo();
    const permissions = createPermissionEvaluator(true);
    const transactions = createTransactionRunner(tx);
    const audit = createAuditRecorder();
    const outbox: OutboxPublisher = { publish: vi.fn(async () => undefined) };
    const { service } = createEventPublisher(outbox);
    const useCase = new CreateAssessmentUseCase(
      repo,
      createMediaAssetRepository(),
      permissions,
      transactions,
      audit,
      service,
    );

    const response = await useCase.execute(createAssessmentRequestContext(), {
      title: 'Quiz',
      purpose: 'QUIZ',
    });

    expect(response.title).toBe('Quiz');
    expect(transactions.run).toHaveBeenCalledTimes(1);
    expect(repo.save).toHaveBeenCalledTimes(1);
    const repoSave = vi.mocked(repo.save);
    const assessmentArg = repoSave.mock.calls[0]?.[0];
    const txArg = repoSave.mock.calls[0]?.[1];
    expect(assessmentArg?.tenantId).toBe(TEST_TENANT_ID);
    expect(assessmentArg?.workspaceId).toBe(TEST_WORKSPACE_ID);
    expect(txArg).toBe(tx);
    expect(audit.record).toHaveBeenCalledWith(expect.anything(), expect.anything(), tx);
    expect(outbox.publish).toHaveBeenCalledWith(
      expect.objectContaining({ eventName: 'assessment.created' }),
      expect.anything(),
      tx,
    );
  });
});
