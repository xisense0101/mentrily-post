export interface PrincipalProvisioned {
  principalId: string;
  email: string;
  occurredAt: Date;
}

export interface ExternalIdentityLinked {
  principalId: string;
  provider: string;
  externalId: string;
  occurredAt: Date;
}

export interface InvitationCreated {
  invitationId: string;
  email: string;
  workspaceId: string;
  occurredAt: Date;
}

export interface InvitationAccepted {
  invitationId: string;
  principalId: string;
  occurredAt: Date;
}

export interface InvitationRevoked {
  invitationId: string;
  occurredAt: Date;
}

export interface ServiceCredentialIssued {
  credentialId: string;
  principalId: string;
  occurredAt: Date;
}

export interface ServiceCredentialRevoked {
  credentialId: string;
  occurredAt: Date;
}
