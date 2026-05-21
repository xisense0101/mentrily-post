import { WorkspaceId } from '../value-objects/index.js';

export interface Team {
  id: string;
  workspaceId: WorkspaceId;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}
