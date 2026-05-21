import { PrincipalId, ServiceCredentialStatus } from '../value-objects/index.js';

export interface ServiceCredential {
  id: string;
  principalId: PrincipalId;
  keyId: string;
  secretHash: string;
  description?: string;
  status: ServiceCredentialStatus;
  expiresAt?: Date;
  lastUsedAt?: Date;
  createdAt: Date;
}
