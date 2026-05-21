import { InvitationStatus } from '../value-objects/index.js';

export interface Invitation {
  id: string;
  email: string;
  workspaceId: string;
  roleKey: string;
  inviterPrincipalId: string;
  status: InvitationStatus;
  token: string;
  expiresAt: Date;
  acceptedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
