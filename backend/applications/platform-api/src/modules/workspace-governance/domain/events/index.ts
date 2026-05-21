export interface WorkspaceProvisioned {
  workspaceId: string;
  slug: string;
  name: string;
  occurredAt: Date;
}

export interface WorkspaceUpdated {
  workspaceId: string;
  occurredAt: Date;
}

export interface WorkspaceSuspended {
  workspaceId: string;
  reason?: string;
  occurredAt: Date;
}

export interface WorkspaceMemberAdded {
  workspaceId: string;
  principalId: string;
  occurredAt: Date;
}

export interface WorkspaceMemberRemoved {
  workspaceId: string;
  principalId: string;
  occurredAt: Date;
}

export interface WorkspaceRoleAssigned {
  workspaceId: string;
  principalId: string;
  roleKey: string;
  occurredAt: Date;
}

export interface WorkspaceDomainVerified {
  workspaceId: string;
  domain: string;
  occurredAt: Date;
}

export interface WorkspaceBrandingUpdated {
  workspaceId: string;
  occurredAt: Date;
}
