import { TransactionContext } from '@mentrily/service-core';
import { WorkspaceRole } from '../entities/index.js';
import { WorkspaceId } from '../value-objects/index.js';

export abstract class WorkspaceRoleRepository {
  abstract findById(id: string, transaction?: TransactionContext): Promise<WorkspaceRole | null>;
  abstract findAllByWorkspaceId(
    workspaceId: WorkspaceId,
    transaction?: TransactionContext,
  ): Promise<WorkspaceRole[]>;
  abstract save(role: WorkspaceRole, transaction?: TransactionContext): Promise<void>;
  abstract delete(id: string, transaction?: TransactionContext): Promise<void>;
  abstract findByKey(
    workspaceId: WorkspaceId,
    key: string,
    transaction?: TransactionContext,
  ): Promise<WorkspaceRole | null>;
}
