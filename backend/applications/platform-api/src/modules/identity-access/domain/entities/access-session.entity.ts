import { PrincipalId } from '../value-objects/index.js';

export interface AccessSession {
  id: string;
  principalId: PrincipalId;
  userAgent?: string;
  ipAddress?: string;
  expiresAt: Date;
  createdAt: Date;
}
