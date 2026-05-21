import { WorkspacePermission } from '../entities/index.js';

export abstract class WorkspacePermissionRepository {
  abstract findAllByRoleId(roleId: string): Promise<WorkspacePermission[]>;
  abstract save(permission: WorkspacePermission): Promise<void>;
  abstract deleteByRoleId(roleId: string): Promise<void>;
}
