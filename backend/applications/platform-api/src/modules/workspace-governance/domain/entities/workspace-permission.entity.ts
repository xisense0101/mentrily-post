import { PermissionKey } from '@mentrily/security-toolkit';

export interface WorkspacePermission {
  id: string;
  roleId: string;
  key: PermissionKey;
  createdAt: Date;
}
