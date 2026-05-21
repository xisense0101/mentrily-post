import { EntitlementKeyString } from '../value-objects/entitlement-key.vo.js';

export interface PrincipalEntitlementOverride {
  entitlementKey: EntitlementKeyString;
  value: number | boolean | 'unlimited';
  expiresAt?: Date;
}

export interface PrincipalEntitlementProfile {
  principalId: string;
  planId: string;
  overrides: PrincipalEntitlementOverride[];
  createdAt: Date;
  updatedAt: Date;
}
