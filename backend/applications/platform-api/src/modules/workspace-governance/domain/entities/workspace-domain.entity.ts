import { WorkspaceId, WorkspaceDomainStatus } from '../value-objects/index.js';

export interface WorkspaceDomain {
  id: string;
  workspaceId: WorkspaceId;
  domain: string;
  status: WorkspaceDomainStatus;
  verificationToken: string;
  verifiedAt?: Date;
  createdAt: Date;
}
