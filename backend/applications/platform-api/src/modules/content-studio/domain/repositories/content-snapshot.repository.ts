import { TransactionContext } from '@mentrily/service-core';
import { ContentPublishedSnapshot } from '../entities/index.js';

export abstract class ContentSnapshotRepository {
  abstract save(snapshot: ContentPublishedSnapshot, transaction?: TransactionContext): Promise<ContentPublishedSnapshot>;
  abstract findLatestByDocumentId(documentId: string, transaction?: TransactionContext): Promise<ContentPublishedSnapshot | null>;
  abstract listByDocumentId(documentId: string, transaction?: TransactionContext): Promise<ContentPublishedSnapshot[]>;
}
