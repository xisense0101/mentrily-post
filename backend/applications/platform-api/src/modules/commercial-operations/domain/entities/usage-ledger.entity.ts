import { EntitlementKeyString } from '../value-objects/entitlement-key.vo.js';

export enum UsageOperation {
  INCREMENT = 'INCREMENT',
  DECREMENT = 'DECREMENT',
  SET = 'SET',
}

export interface UsageLedgerEntry {
  id: string;
  workspaceId: string;
  subscriptionId: string;
  entitlementKey: EntitlementKeyString;
  operation: UsageOperation;
  amount: number;
  periodStart: Date;
  periodEnd: Date;
  correlationId?: string;
  recordedAt: Date;
}
