import { TransactionContext } from '@mentrily/service-core';
import { Workspace } from '../entities/index.js';
import { WorkspaceId, WorkspaceSlug } from '../value-objects/index.js';

export abstract class WorkspaceRepository {
  abstract findById(id: WorkspaceId, transaction?: TransactionContext): Promise<Workspace | null>;
  abstract findBySlug(
    slug: WorkspaceSlug,
    transaction?: TransactionContext,
  ): Promise<Workspace | null>;
  abstract save(workspace: Workspace, transaction?: TransactionContext): Promise<void>;
}
