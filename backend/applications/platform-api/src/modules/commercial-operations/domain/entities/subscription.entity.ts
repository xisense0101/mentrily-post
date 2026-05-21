import { EntitlementKeyString } from '../value-objects/entitlement-key.vo.js';

export enum SubscriptionStatus {
  TRIALING = 'TRIALING',
  ACTIVE = 'ACTIVE',
  PAST_DUE = 'PAST_DUE',
  CANCELED = 'CANCELED',
  INCOMPLETE = 'INCOMPLETE',
}

export interface EntitlementOverride {
  id: string;
  subscriptionId: string;
  entitlementKey: EntitlementKeyString;
  value: number | boolean | 'unlimited';
  expiresAt?: Date;
}

export interface Subscription {
  id: string;
  workspaceId: string;
  planId: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  overrides: EntitlementOverride[];
}
