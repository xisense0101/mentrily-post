import { WorkspaceId, MembershipStatus } from '../value-objects/index.js';

export interface WorkspaceMember {
  id: string;
  workspaceId: WorkspaceId;
  principalId: string;
  status: MembershipStatus;
  joinedAt: Date;
  createdAt: Date;
}
