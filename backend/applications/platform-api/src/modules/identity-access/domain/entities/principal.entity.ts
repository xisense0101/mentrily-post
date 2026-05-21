import { PrincipalId, PrincipalStatus } from '../value-objects/index.js';

export interface Principal {
  id: PrincipalId;
  email: string;
  displayName?: string;
  status: PrincipalStatus;
  createdAt: Date;
  updatedAt: Date;
}
