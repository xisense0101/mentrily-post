import { WorkspaceDomain } from '../entities/index.js';
import { WorkspaceId } from '../value-objects/index.js';

export abstract class WorkspaceDomainRepository {
  abstract findById(id: string): Promise<WorkspaceDomain | null>;
  abstract findAllByWorkspaceId(workspaceId: WorkspaceId): Promise<WorkspaceDomain[]>;
  abstract save(domain: WorkspaceDomain): Promise<void>;
  abstract delete(id: string): Promise<void>;
}
