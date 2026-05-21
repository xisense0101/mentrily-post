import { WorkspaceId, WorkspaceSlug, WorkspaceStatus } from '../value-objects/index.js';

export interface Workspace {
  id: WorkspaceId;
  name: string;
  slug: WorkspaceSlug;
  status: WorkspaceStatus;
  createdAt: Date;
  updatedAt: Date;
}
