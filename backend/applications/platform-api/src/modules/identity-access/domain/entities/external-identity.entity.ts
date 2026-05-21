import { PrincipalId, ExternalProvider } from '../value-objects/index.js';

export interface ExternalIdentity {
  id: string;
  principalId: PrincipalId;
  provider: ExternalProvider;
  externalId: string;
  email: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}
