export interface WorkspaceDto {
  id: string;
  name: string;
  slug: string;
  status: string;
}

export interface WorkspaceMemberDto {
  id: string;
  workspaceId: string;
  principalId: string;
  status: string;
  joinedAt: string;
}

export interface ProvisionWorkspaceInput {
  name: string;
  slug: string;
  ownerPrincipalId: string;
}

export interface AddWorkspaceMemberInput {
  workspaceId: string;
  principalId: string;
}

export interface RemoveWorkspaceMemberInput {
  workspaceId: string;
  memberId: string;
}

export interface AssignWorkspaceRoleInput {
  workspaceId: string;
  memberId: string;
  roleKey: string;
}
