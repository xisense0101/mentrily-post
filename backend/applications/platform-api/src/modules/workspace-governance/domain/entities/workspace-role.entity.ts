import { WorkspaceId } from '../value-objects/index.js';

export interface WorkspaceRole {
  id: string;
  workspaceId: WorkspaceId;
  name: string;
  key: string;
  isSystem: boolean;
  createdAt: Date;
}
