import { TransactionContext } from '@mentrily/service-core';
import { WorkspaceMember } from '../entities/index.js';
import { WorkspaceId } from '../value-objects/index.js';

export abstract class WorkspaceMemberRepository {
  abstract findById(id: string, transaction?: TransactionContext): Promise<WorkspaceMember | null>;
  abstract findByWorkspaceAndPrincipal(
    workspaceId: WorkspaceId,
    principalId: string,
    transaction?: TransactionContext,
  ): Promise<WorkspaceMember | null>;
  abstract findAllByWorkspaceId(
    workspaceId: WorkspaceId,
    transaction?: TransactionContext,
  ): Promise<WorkspaceMember[]>;
  abstract save(member: WorkspaceMember, transaction?: TransactionContext): Promise<void>;
  abstract delete(id: string, transaction?: TransactionContext): Promise<void>;
  abstract assignRole(
    memberId: string,
    roleId: string,
    transaction?: TransactionContext,
  ): Promise<void>;
  abstract getMemberRoles(memberId: string, transaction?: TransactionContext): Promise<string[]>;
}
