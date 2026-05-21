import type { RequestContext, WorkspaceContext } from './context.js';

export interface PermissionEvaluationInput {
  permission: string;
  resource?: string;
  workspace?: WorkspaceContext;
}

export interface PermissionEvaluationResult {
  allowed: boolean;
  reason?: string;
}

export interface PermissionEvaluator {
  evaluate(input: PermissionEvaluationInput, context: RequestContext): Promise<PermissionEvaluationResult>;
}

export interface EntitlementEvaluationInput {
  entitlementKey: string;
  subject: EntitlementSubject;
}

export type EntitlementSubject =
  | {
      kind: 'workspace';
      workspaceId: string;
    }
  | {
      kind: 'principal';
      principalId: string;
    };

export interface EntitlementEvaluationResult {
  enabled: boolean;
  reason?: string;
}

export interface EntitlementEvaluator {
  evaluate(input: EntitlementEvaluationInput, context: RequestContext): Promise<EntitlementEvaluationResult>;
}

export interface AuditRecordInput {
  action: string;
  actorId?: string;
  targetType: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditRecorder {
  record(input: AuditRecordInput, context: RequestContext, transaction?: TransactionContext): Promise<void>;
}

export interface OutboxEvent<TPayload = Record<string, unknown>> {
  eventId: string;
  eventName: string;
  eventVersion: number;
  tenantId?: string | undefined;
  workspaceId?: string | undefined;
  correlationId: string;
  idempotencyKey?: string | undefined;
  occurredAt: string;
  payload: TPayload;
}

export interface OutboxPublisher {
  publish<TPayload>(
    event: OutboxEvent<TPayload>,
    context: RequestContext,
    transaction?: TransactionContext,
  ): Promise<void>;
}

// --- Durable Audit/Outbox/Inbox Contracts ---

/**
 * Persisted audit record.
 * Represents a privileged action or security-relevant event for compliance/audit trails.
 *
 * Fields:
 * - id: Unique record identifier (UUID)
 * - action: Action name (e.g., 'workspace.member.added')
 * - actorId: Principal who performed the action (may be null for system actions)
 * - targetType: Resource type affected (e.g., 'workspace', 'user')
 * - targetId: Resource ID affected
 * - tenantId: Workspace context (may be null for principal-scoped/system events)
 * - workspaceId: Workspace context (may be null for principal-scoped/system events)
 * - requestId: Request context for tracing
 * - correlationId: Correlation context for distributed tracing
 * - metadata: JSON-safe additional context
 * - occurredAt: When the action occurred
 * - createdAt: When the record was persisted
 */
export interface AuditRecord {
  id: string;
  action: string;
  actorId?: string | null;
  targetType: string;
  targetId?: string | null;
  tenantId?: string | null;
  workspaceId?: string | null;
  requestId?: string | null;
  correlationId?: string | null;
  metadata?: Record<string, unknown> | null;
  occurredAt: Date;
  createdAt: Date;
}

/**
 * Outbox message status lifecycle.
 *
 * - PENDING: Awaiting relay to consumers
 * - PROCESSING: Currently being relayed
 * - PUBLISHED: Successfully relayed to bus/consumers
 * - FAILED: Relay permanently failed (check attempt count + retry policy)
 */
export enum OutboxMessageStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  PUBLISHED = 'PUBLISHED',
  FAILED = 'FAILED',
}

/**
 * Persisted outbox message.
 * Transactional event record for reliable cross-module/async propagation.
 *
 * Fields:
 * - id: Unique message identifier (UUID)
 * - eventId: Business event ID from OutboxEvent (unique within tenantId/workspaceId)
 * - eventName: Event name (e.g., 'identity.membership.granted.v1')
 * - eventVersion: Event schema version
 * - tenantId: Workspace context (may be null for principal-scoped events)
 * - workspaceId: Workspace context (may be null for principal-scoped events)
 * - correlationId: Distributed tracing correlation ID
 * - idempotencyKey: Optional idempotency key for relay deduplication
 * - payload: JSON event payload
 * - occurredAt: Business event timestamp from OutboxEvent
 * - status: Current lifecycle status (PENDING|PROCESSING|PUBLISHED|FAILED)
 * - attemptCount: Number of relay attempts
 * - availableAt: When the message is available for relay (futures for delayed dispatch)
 * - publishedAt: When successfully published to consumers (null if not yet published)
 * - createdAt: Record creation time
 * - updatedAt: Last status/attempt update time
 */
export interface OutboxRecord {
  id: string;
  eventId: string;
  eventName: string;
  eventVersion: number;
  tenantId?: string | null;
  workspaceId?: string | null;
  correlationId: string;
  idempotencyKey?: string | null;
  payload: Record<string, unknown>;
  occurredAt: Date;
  status: OutboxMessageStatus;
  attemptCount: number;
  availableAt: Date;
  publishedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Inbox message status lifecycle.
 *
 * - RECEIVED: Inbound event received and stored
 * - PROCESSING: Currently being processed by consumer
 * - PROCESSED: Successfully processed and committed
 * - FAILED: Processing failed (check metadata for error details)
 */
export enum InboxMessageStatus {
  RECEIVED = 'RECEIVED',
  PROCESSING = 'PROCESSING',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED',
}

/**
 * Persisted inbox message.
 * Inbound external event deduplication and idempotency record.
 *
 * Idempotency rule: Duplicate inbound events are identified by (source + externalEventId).
 * Only the first occurrence is processed; duplicates are detected on claim.
 *
 * Fields:
 * - id: Unique inbox record identifier (UUID)
 * - source: External source identifier (e.g., 'stripe', 'slack', 'webhook-partner-x')
 * - externalEventId: Source-provided event ID (e.g., Stripe event ID)
 * - eventName: Internal event name mapped from source
 * - idempotencyKey: Optional idempotency key for additional deduplication
 * - payloadHash: Hash of payload for change detection (SHA256 hex)
 * - status: Current lifecycle status (RECEIVED|PROCESSING|PROCESSED|FAILED)
 * - receivedAt: When the inbound event was received
 * - processedAt: When successfully processed (null if not yet processed)
 * - createdAt: Record creation time
 * - updatedAt: Last status update time
 */
export interface InboxRecord {
  id: string;
  source: string;
  externalEventId: string;
  eventName: string;
  idempotencyKey?: string | null;
  payloadHash: string;
  status: InboxMessageStatus;
  receivedAt: Date;
  processedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Result of an inbox claim/insert operation.
 * Indicates whether the event was new (claimed) or a duplicate.
 */
export interface InboxClaimResult {
  /** Whether this was a new event (true) or duplicate (false) */
  wasClaimed: boolean;
  /** The persisted inbox record */
  record: InboxRecord;
}
/**
 * A provider-agnostic transaction context.
 * Carries a unique transaction ID and the underlying database client (as unknown).
 */
export interface TransactionContext {
  readonly transactionId: string;
  readonly client: unknown;
}

/**
 * A runner that executes operations within a transactional boundary.
 */
export interface TransactionRunner {
  /**
   * Executes the given operation within a transaction.
   * If the operation fails, the transaction is rolled back.
   */
  run<T>(operation: (transaction: TransactionContext) => Promise<T>): Promise<T>;
}
