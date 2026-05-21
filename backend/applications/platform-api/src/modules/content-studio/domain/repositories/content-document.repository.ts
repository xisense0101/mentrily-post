import { TransactionContext } from '@mentrily/service-core';
import { ContentDocument } from '../entities/index.js';
import { ContentDocumentPurpose } from '../value-objects/index.js';

export abstract class ContentDocumentRepository {
  abstract save(document: ContentDocument, transaction?: TransactionContext): Promise<ContentDocument>;
  abstract findById(id: string, transaction?: TransactionContext): Promise<ContentDocument | null>;
  abstract listByWorkspace(workspaceId: string, transaction?: TransactionContext): Promise<ContentDocument[]>;
  abstract listByPurpose(
    workspaceId: string,
    purpose: ContentDocumentPurpose,
    transaction?: TransactionContext,
  ): Promise<ContentDocument[]>;
}
