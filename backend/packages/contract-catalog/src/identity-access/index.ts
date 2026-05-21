export interface PrincipalDto {
  id: string;
  email: string;
  displayName?: string;
  status: string;
}

export interface InvitationDto {
  id: string;
  email: string;
  workspaceId: string;
  roleKey: string;
  status: string;
  expiresAt: string;
}

export interface CreateInvitationInput {
  workspaceId: string;
  email: string;
  roleKey: string;
  inviterPrincipalId: string;
}

export interface AcceptInvitationInput {
  invitationId: string;
  principalId: string;
}

export interface RevokeInvitationInput {
  invitationId: string;
  revokerPrincipalId: string;
}
