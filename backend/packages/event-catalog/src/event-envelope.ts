/**
 * Canonical event envelope for domain events.
 *
 * This is the standard shape for all publishable domain events in Mentrily.
 * Events are persisted to the outbox and relayed to consumers via the worker relay.
 *
 * Fields:
 * - eventId: Globally unique event identifier (UUID) - must be unique within (tenantId, workspaceId)
 * - eventName: Semantic versioned event name (e.g., 'identity.membership.granted.v1')
 * - eventVersion: Schema version of the event payload (for migrations/compatibility)
 * - occurredAt: ISO 8601 timestamp when the business event occurred
 * - correlationId: Distributed tracing correlation ID from the originating request
 * - tenantId: Workspace context (may be null for principal-scoped events)
 * - workspaceId: Workspace context (may be null for principal-scoped events)
 * - idempotencyKey: Optional idempotency key for deduplication at consumer end
 * - payload: Event-specific data payload (domain contracts define structure per event)
 *
 * Versioning rule:
 * - Event names must include semantic versioning: {domain}.{section}.{action}.v{N}
 * - Examples: 'identity.membership.granted.v1', 'commercial.entitlement.changed.v1'
 * - Version bumps are required for payload shape changes
 * - Consumers must handle multiple versions for backward compatibility
 *
 * Idempotency rule:
 * - idempotencyKey is set by the producer for write operations
 * - Must be deterministic (not random UUID)
 * - Format: {workspaceId}:{entityType}:{entityId}:{action}:{timestamp}
 * - Consumers dedupe by idempotencyKey within a time window
 * - Inbox messages detect duplicates by (source + externalEventId)
 *
 * Naming rule (for domain events):
 * - {domain}.{section}.{topic}.v{N}
 * - domain: identity, workspace, commercial, content, learning, assessment, credentialing, communication, integration, intelligence
 * - section: sub-domain or feature area
 * - topic: action or state change (e.g., granted, changed, created, deleted)
 * - v{N}: Schema version
 *
 * Optionality:
 * - eventId: REQUIRED (uniqueness enforced at persistence/Prisma unique constraint)
 * - eventName: REQUIRED
 * - eventVersion: REQUIRED (minimum 1)
 * - occurredAt: REQUIRED
 * - correlationId: REQUIRED (from RequestContext)
 * - tenantId: OPTIONAL (null for principal-scoped events like personal workspace creation)
 * - workspaceId: OPTIONAL (null for principal-scoped events)
 * - idempotencyKey: OPTIONAL (recommended for all mutations)
 * - payload: REQUIRED (at minimum an empty object {})
 *
 * Constraints:
 * - Total envelope size should not exceed 1MB (adjust based on payload requirements)
 * - Payload must be JSON-serializable
 * - Do not include mutable references or circular structures
 */
export interface DomainEventEnvelope<TPayload = Record<string, unknown>> {
  eventId: string;
  eventName: string;
  eventVersion: number;
  occurredAt: string;
  correlationId: string;
  tenantId?: string;
  workspaceId?: string;
  idempotencyKey?: string;
  payload: TPayload;
}

/**
 * Outbound event metadata for worker relay and async publishing.
 *
 * This is used internally by the outbox relay system to track
 * event distribution state and retry behavior.
 */
export interface OutboundEventMetadata {
  /** Message ID in outbox */
  messageId: string;
  /** Current relay attempt number */
  attemptNumber: number;
  /** Maximum relay attempts before marking failed */
  maxAttempts: number;
  /** Backoff multiplier for retry scheduling (in milliseconds) */
  retryBackoffMs: number;
}

/**
 * Inbound event metadata for inbox processing.
 *
 * This is used internally by the inbox consumer to track
 * event processing state and deduplication.
 */
export interface InboundEventMetadata {
  /** Source system identifier (e.g., 'stripe', 'webhook-partner-x') */
  source: string;
  /** Source-provided event ID (e.g., Stripe event_id) */
  externalEventId: string;
  /** Inbox record ID in database */
  inboxMessageId: string;
  /** Whether this was a duplicate (deduped) event */
  wasDeduped: boolean;
}
