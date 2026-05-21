import { describe, expect, it, vi } from 'vitest';
import {
  AuditRecorder,
  OutboxPublisher,
  PermissionEvaluator,
  RequestContext,
  TransactionContext,
  TransactionRunner,
} from '@mentrily/service-core';
import { ContentDocumentRepository } from '../domain/repositories/index.js';
import { ContentEventPublisherService } from '../application/services/index.js';
import { CreateContentDocumentUseCase } from '../application/use-cases/index.js';
import { ContentDocument } from '../domain/index.js';
import { createContentRequestContext } from './content-test-fixtures.js';

function createRepo(): ContentDocumentRepository {
  return {
    save: vi.fn(async (document: ContentDocument) => document),
    findById: vi.fn(async () => null),
    listByWorkspace: vi.fn(async () => []),
    listByPurpose: vi.fn(async () => []),
  };
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
    service: new ContentEventPublisherService(outbox),
  };
}

describe('CreateContentDocumentUseCase', () => {
  it('fails without workspace context', async () => {
    const repo = createRepo();
    const permissions = createPermissionEvaluator(true);
    const transactions = createTransactionRunner({ transactionId: 'tx-1', client: {} });
    const audit = createAuditRecorder();
    const { service } = createEventPublisher();
    const useCase = new CreateContentDocumentUseCase(
      repo,
      permissions,
      transactions,
      audit,
      service,
    );

    await expect(
      useCase.execute(
        { requestId: 'req', correlationId: 'cor', timestamp: new Date().toISOString() },
        { title: 'Doc', purpose: 'COURSE_CONTENT' },
      ),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('fails without actor', async () => {
    const repo = createRepo();
    const permissions = createPermissionEvaluator(true);
    const transactions = createTransactionRunner({ transactionId: 'tx-1', client: {} });
    const audit = createAuditRecorder();
    const { service } = createEventPublisher();
    const useCase = new CreateContentDocumentUseCase(
      repo,
      permissions,
      transactions,
      audit,
      service,
    );
    const context: RequestContext = createContentRequestContext({
      workspace: { tenantId: 'tenant-1', workspaceId: 'workspace-1' },
    });

    await expect(
      useCase.execute(context, { title: 'Doc', purpose: 'COURSE_CONTENT' }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('permission denial prevents transaction', async () => {
    const repo = createRepo();
    const permissions = createPermissionEvaluator(false);
    const transactions = createTransactionRunner({ transactionId: 'tx-1', client: {} });
    const audit = createAuditRecorder();
    const { service } = createEventPublisher();
    const useCase = new CreateContentDocumentUseCase(
      repo,
      permissions,
      transactions,
      audit,
      service,
    );

    await expect(
      useCase.execute(createContentRequestContext(), { title: 'Doc', purpose: 'COURSE_CONTENT' }),
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
    const useCase = new CreateContentDocumentUseCase(
      repo,
      permissions,
      transactions,
      audit,
      service,
    );

    const response = await useCase.execute(createContentRequestContext(), {
      title: 'Doc',
      purpose: 'COURSE_CONTENT',
      blocks: [
        { id: 'block-1', kind: 'PARAGRAPH', position: 0, path: '0', content: { text: 'A' } },
      ],
    });

    expect(response.title).toBe('Doc');
    expect(transactions.run).toHaveBeenCalledTimes(1);
    expect(repo.save).toHaveBeenCalledTimes(1);
    const repoSave = vi.mocked(repo.save);
    const documentArg = repoSave.mock.calls[0]?.[0];
    const txArg = repoSave.mock.calls[0]?.[1];
    expect(documentArg.tenantId).toBe('11111111-1111-4111-8111-111111111111');
    expect(documentArg.workspaceId).toBe('22222222-2222-4222-8222-222222222222');
    expect(txArg).toBe(tx);
    expect(audit.record).toHaveBeenCalledWith(expect.anything(), expect.anything(), tx);
    expect(outbox.publish).toHaveBeenCalledWith(
      expect.objectContaining({ eventName: 'content.document.created' }),
      expect.anything(),
      tx,
    );
  });
});
