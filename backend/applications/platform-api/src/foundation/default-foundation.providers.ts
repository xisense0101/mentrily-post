import {
  AUDIT_RECORDER,
  ENTITLEMENT_EVALUATOR,
  OUTBOX_PUBLISHER,
  PERMISSION_EVALUATOR,
  type AuditRecordInput,
  type AuditRecorder,
  type EntitlementEvaluationInput,
  type EntitlementEvaluationResult,
  type EntitlementEvaluator,
  type OutboxEvent,
  type OutboxPublisher,
  type PermissionEvaluationInput,
  type PermissionEvaluationResult,
  type PermissionEvaluator,
  type RequestContext,
  type TransactionContext,
} from '@mentrily/service-core';

export class DefaultPermissionEvaluator implements PermissionEvaluator {
  async evaluate(
    _input: PermissionEvaluationInput,
    _context: RequestContext,
  ): Promise<PermissionEvaluationResult> {
    return { allowed: false, reason: 'default-deny-scaffold-placeholder' };
  }
}

export class DefaultEntitlementEvaluator implements EntitlementEvaluator {
  async evaluate(
    _input: EntitlementEvaluationInput,
    _context: RequestContext,
  ): Promise<EntitlementEvaluationResult> {
    return { enabled: false, reason: 'default-disabled-scaffold-placeholder' };
  }
}

export class DefaultAuditRecorder implements AuditRecorder {
  async record(
    _input: AuditRecordInput,
    _context: RequestContext,
    _transaction?: TransactionContext,
  ): Promise<void> {
    return;
  }
}

export class DefaultOutboxPublisher implements OutboxPublisher {
  async publish<TPayload>(
    _event: OutboxEvent<TPayload>,
    _context: RequestContext,
    _transaction?: TransactionContext,
  ): Promise<void> {
    return;
  }
}

export const defaultFoundationProviders = [
  { provide: PERMISSION_EVALUATOR, useClass: DefaultPermissionEvaluator },
  { provide: ENTITLEMENT_EVALUATOR, useClass: DefaultEntitlementEvaluator },
  { provide: AUDIT_RECORDER, useClass: DefaultAuditRecorder },
  { provide: OUTBOX_PUBLISHER, useClass: DefaultOutboxPublisher },
];
