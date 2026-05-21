import { describe, expect, it, vi } from 'vitest';
import {
  AuditRecorder,
  OutboxPublisher,
  PermissionEvaluator,
  TransactionContext,
  TransactionRunner,
} from '@mentrily/service-core';
import { ContentDocumentRepository } from '../domain/repositories/index.js';
import { BlockTreePolicyService } from '../domain/services/index.js';
import { ContentEventPublisherService } from '../application/services/index.js';
import { ReplaceContentBlocksUseCase } from '../application/use-cases/index.js';
import { ContentDocument } from '../domain/index.js';
import { createContentRequestContext, createDraftDocument } from './content-test-fixtures.js';

function createRepo(document: ContentDocument | null): ContentDocumentRepository {
  return {
    save: vi.fn(async (value: ContentDocument) => value),
    findById: vi.fn(async () => document),
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

describe('ReplaceContentBlocksUseCase', () => {
  it('fails on permission denial', async () => {
    const repo = createRepo(null);
    const permissions = createPermissionEvaluator(false);
    const transactions = createTransactionRunner({ transactionId: 'tx-1', client: {} });
    const audit = createAuditRecorder();
    const { service } = createEventPublisher();
    const useCase = new ReplaceContentBlocksUseCase(
      repo,
      permissions,
      transactions,
      audit,
      service,
      new BlockTreePolicyService(),
    );

    await expect(
      useCase.execute(createContentRequestContext(), 'document-1', { blocks: [] }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('treats cross-workspace document as not found', async () => {
    const document = createDraftDocument({ workspaceId: 'workspace-2' });
    const repo = createRepo(document);
    const permissions = createPermissionEvaluator(true);
    const transactions = createTransactionRunner({ transactionId: 'tx-1', client: {} });
    const audit = createAuditRecorder();
    const { service } = createEventPublisher();
    const useCase = new ReplaceContentBlocksUseCase(
      repo,
      permissions,
      transactions,
      audit,
      service,
      new BlockTreePolicyService(),
    );

    await expect(
      useCase.execute(createContentRequestContext(), document.id, { blocks: [] }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('rejects invalid block tree', async () => {
    const document = createDraftDocument();
    const repo = createRepo(document);
    const permissions = createPermissionEvaluator(true);
    const transactions = createTransactionRunner({ transactionId: 'tx-1', client: {} });
    const audit = createAuditRecorder();
    const { service } = createEventPublisher();
    const useCase = new ReplaceContentBlocksUseCase(
      repo,
      permissions,
      transactions,
      audit,
      service,
      new BlockTreePolicyService(),
    );

    await expect(
      useCase.execute(createContentRequestContext(), document.id, {
        blocks: [
          { id: 'block-1', kind: 'PARAGRAPH', position: 0, path: '0', content: { text: 'A' } },
          {
            id: 'block-2',
            parentBlockId: 'missing',
            kind: 'PARAGRAPH',
            position: 0,
            path: '0.0',
            content: { text: 'B' },
          },
        ],
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('saves valid draft blocks and emits audit/outbox in transaction', async () => {
    const document = createDraftDocument();
    const tx: TransactionContext = { transactionId: 'tx-1', client: {} };
    const repo = createRepo(document);
    const permissions = createPermissionEvaluator(true);
    const transactions = createTransactionRunner(tx);
    const audit = createAuditRecorder();
    const outbox: OutboxPublisher = { publish: vi.fn(async () => undefined) };
    const { service } = createEventPublisher(outbox);
    const useCase = new ReplaceContentBlocksUseCase(
      repo,
      permissions,
      transactions,
      audit,
      service,
      new BlockTreePolicyService(),
    );

    const response = await useCase.execute(createContentRequestContext(), document.id, {
      blocks: [
        { id: 'block-1', kind: 'HEADING', position: 0, path: '0', content: { text: 'A' } },
        {
          id: 'block-2',
          parentBlockId: 'block-1',
          kind: 'PARAGRAPH',
          position: 0,
          path: '0.0',
          content: { text: 'B' },
        },
      ],
    });

    expect(response.currentDraftVersion?.blocks).toHaveLength(2);
    expect(repo.save).toHaveBeenCalledWith(expect.anything(), tx);
    expect(audit.record).toHaveBeenCalledWith(expect.anything(), expect.anything(), tx);
    expect(outbox.publish).toHaveBeenCalledWith(
      expect.objectContaining({ eventName: 'content.document.draft_blocks_replaced' }),
      expect.anything(),
      tx,
    );
  });
});
