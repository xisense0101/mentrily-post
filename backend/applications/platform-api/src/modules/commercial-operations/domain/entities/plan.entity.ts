import { EntitlementKeyString } from '../value-objects/entitlement-key.vo.js';

export enum EntitlementValueType {
  BOOLEAN = 'BOOLEAN',
  NUMBER = 'NUMBER',
  UNLIMITED = 'UNLIMITED',
}

export interface EntitlementDefinition {
  key: EntitlementKeyString;
  description: string;
  valueType: EntitlementValueType;
}

export interface PlanEntitlement {
  planId: string;
  entitlementKey: EntitlementKeyString;
  value: number | boolean | 'unlimited';
}

export interface PlanPrice {
  id: string;
  planId: string;
  currency: string;
  amount: number;
  interval: 'MONTH' | 'YEAR';
}

export interface Plan {
  id: string;
  code: string; // 'free', 'starter', 'pro', 'enterprise'
  name: string;
  description?: string;
  isCustom: boolean;
  entitlements: PlanEntitlement[];
  prices: PlanPrice[];
}
