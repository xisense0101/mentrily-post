import { describe, expect, it, vi } from 'vitest';
import {
  AuditRecorder,
  OutboxPublisher,
  PermissionEvaluator,
  TransactionContext,
  TransactionRunner,
} from '@mentrily/service-core';
import {
  ContentDocumentRepository,
  ContentSnapshotRepository,
} from '../domain/repositories/index.js';
import {
  ContentPublishPolicyService,
  BlockTreePolicyService,
  ContentDocumentPurpose,
  BlockContentKind,
} from '../domain/index.js';
import { ContentEventPublisherService } from '../application/services/index.js';
import { PublishContentDocumentUseCase } from '../application/use-cases/index.js';
import {
  createBlock,
  createContentRequestContext,
  createDraftDocument,
} from './content-test-fixtures.js';
import { ContentDocument, ContentPublishedSnapshot } from '../domain/index.js';

function createDocumentRepo(document: ContentDocument | null): ContentDocumentRepository {
  return {
    save: vi.fn(async (value: ContentDocument) => value),
    findById: vi.fn(async () => document),
    listByWorkspace: vi.fn(async () => []),
    listByPurpose: vi.fn(async () => []),
  };
}

function createSnapshotRepo(): ContentSnapshotRepository {
  return {
    save: vi.fn(async (snapshot: ContentPublishedSnapshot) => snapshot),
    findLatestByDocumentId: vi.fn(async () => null),
    listByDocumentId: vi.fn(async () => []),
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

describe('PublishContentDocumentUseCase', () => {
  it('fails on permission denial', async () => {
    const repo = createDocumentRepo(null);
    const snapshots = createSnapshotRepo();
    const permissions = createPermissionEvaluator(false);
    const transactions = createTransactionRunner({ transactionId: 'tx-1', client: {} });
    const audit = createAuditRecorder();
    const { service } = createEventPublisher();
    const useCase = new PublishContentDocumentUseCase(
      repo,
      snapshots,
      permissions,
      transactions,
      audit,
      service,
      new ContentPublishPolicyService(new BlockTreePolicyService()),
    );

    await expect(
      useCase.execute(createContentRequestContext(), 'document-1', {}),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('cannot publish an empty document', async () => {
    const document = createDraftDocument({ blocks: [] });
    const repo = createDocumentRepo(document);
    const snapshots = createSnapshotRepo();
    const permissions = createPermissionEvaluator(true);
    const transactions = createTransactionRunner({ transactionId: 'tx-1', client: {} });
    const audit = createAuditRecorder();
    const { service } = createEventPublisher();
    const useCase = new PublishContentDocumentUseCase(
      repo,
      snapshots,
      permissions,
      transactions,
      audit,
      service,
      new ContentPublishPolicyService(new BlockTreePolicyService()),
    );

    await expect(
      useCase.execute(createContentRequestContext(), document.id, {}),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('rejects reserved assessment blocks for course content', async () => {
    const document = createDraftDocument({
      purpose: ContentDocumentPurpose.COURSE_CONTENT,
      blocks: [createBlock({ kind: BlockContentKind.MCQ_QUESTION })],
    });
    const repo = createDocumentRepo(document);
    const snapshots = createSnapshotRepo();
    const permissions = createPermissionEvaluator(true);
    const transactions = createTransactionRunner({ transactionId: 'tx-1', client: {} });
    const audit = createAuditRecorder();
    const { service } = createEventPublisher();
    const useCase = new PublishContentDocumentUseCase(
      repo,
      snapshots,
      permissions,
      transactions,
      audit,
      service,
      new ContentPublishPolicyService(new BlockTreePolicyService()),
    );

    await expect(
      useCase.execute(createContentRequestContext(), document.id, {}),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('publishes valid document and saves snapshot in same transaction', async () => {
    const document = createDraftDocument();
    const tx: TransactionContext = { transactionId: 'tx-1', client: {} };
    const repo = createDocumentRepo(document);
    const snapshots = createSnapshotRepo();
    const permissions = createPermissionEvaluator(true);
    const transactions = createTransactionRunner(tx);
    const audit = createAuditRecorder();
    const outbox: OutboxPublisher = { publish: vi.fn(async () => undefined) };
    const { service } = createEventPublisher(outbox);
    const useCase = new PublishContentDocumentUseCase(
      repo,
      snapshots,
      permissions,
      transactions,
      audit,
      service,
      new ContentPublishPolicyService(new BlockTreePolicyService()),
    );

    const response = await useCase.execute(createContentRequestContext(), document.id, {});

    expect(response.status).toBe('PUBLISHED');
    expect(repo.save).toHaveBeenCalledWith(expect.anything(), tx);
    expect(snapshots.save).toHaveBeenCalledWith(expect.anything(), tx);
    expect(audit.record).toHaveBeenCalledWith(expect.anything(), expect.anything(), tx);
    expect(outbox.publish).toHaveBeenCalledTimes(2);
    expect(outbox.publish).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ eventName: 'content.document.published' }),
      expect.anything(),
      tx,
    );
    expect(outbox.publish).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ eventName: 'content.snapshot.created' }),
      expect.anything(),
      tx,
    );
  });
});
