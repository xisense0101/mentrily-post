# Event Standard

## Domain Event Principles

- **Immutable Facts**: Events represent immutable state changes that have already occurred.
- **Versioned Event Names**: Use semantic versioning in event names (e.g., `identity.membership.granted.v1`).
- **Correlation and Causation**: Include correlation IDs for distributed tracing and causation tracking.
- **Tenant Context**: Include `tenantId` and `workspaceId` for multi-tenant scoping.
- **Idempotency**: Support idempotent processing at consumer-end via `idempotencyKey` or inbox deduplication.

## Event Envelope Requirements

All domain events must follow the canonical envelope:

```typescript
interface DomainEvent {
  eventId: string;              // UUID, unique within (tenant, workspace)
  eventName: string;            // Versioned name: {domain}.{section}.{action}.v{N}
  eventVersion: number;         // Payload schema version
  occurredAt: string;           // ISO 8601 timestamp (when state changed)

## Media event note

- Media outbox payloads may include asset IDs, object keys, content types, and file categories.
- Signed upload/read URLs must not be emitted in outbox payloads.
  correlationId: string;        // From RequestContext (required)
  tenantId?: string;            // Workspace context (optional for principal-scoped)
  workspaceId?: string;         // Workspace context (optional for principal-scoped)
  idempotencyKey?: string;      // Deterministic dedup key (not random UUID)
  payload: unknown;             // Event-specific data (JSON-serializable)
}
```

## Event Naming Convention

Format: `{domain}.{section}.{topic}.v{N}`

Domains:

- `identity`, `workspace`, `commercial`, `content`, `learning`, `assessment`, `credentialing`, `communication`, `integration`, `intelligence`

## Task 014D Update

- Assessment attempt retries must reuse deterministic lifecycle behavior so repeated save/submit calls do not emit duplicate grading or result events.

Section: Feature area or bounded context within domain.

Topic: Action or state change (e.g., `granted`, `changed`, `created`).

Version: Schema version (integer).

Examples:

- `identity.membership.granted.v1`
- `commercial.entitlement.changed.v2`
- `workspace.provisioned.v1`

## Idempotency Key Requirements

`idempotencyKey` must be **deterministic**, not random:

- **Format**: `{workspaceId}:{entityType}:{entityId}:{action}:{timestamp}`
- **Example**: `ws-001:workspace_member:member-123:added:2026-05-11T10:30:00Z`
- **Usage**: Consumers deduplicate by key within a bounded time window (24h recommended)

For events without deterministic key candidates, use `eventId` as dedup (Prisma unique constraint on `OutboxMessage.eventId`).

## Outbox Pattern (Producer)

All state-changing operations must persist events to outbox:

```typescript
// In use case
async execute(input: CreateMemberInput, context: RequestContext): Promise<void> {
  // 1. Validate and authorize
  // 2. Execute domain logic
  // 3. Persist state change
  // 4. Create event
  const event: OutboxEvent = {
    eventId: generateId(),
    eventName: 'identity.membership.granted.v1',
    eventVersion: 1,
    tenantId: context.workspace?.tenantId,
    workspaceId: context.workspace?.workspaceId,
    correlationId: context.correlationId,
    idempotencyKey: `${workspaceId}:member:${memberId}:granted:${now}`,
    occurredAt: new Date().toISOString(),
    payload: { principalId, workspaceId, roleKey },
  };
  // 5. Publish to outbox (persisted in same transaction)
  await this.outbox.publish(event, context);
}
```

**Guarantee**: Event persisted transactionally with state change (all-or-nothing).
If the producer retries and the unique `eventId` collides, the repository returns the existing outbox row instead of creating a duplicate.
Content Studio 009B uses deterministic idempotency keys derived from event name, aggregate ID, event version, and event timestamp before writing to the outbox.

## Inbox Pattern (Consumer)

Subscribers must deduplicate inbound external events:

```typescript
// In webhook handler
async handleStripeEvent(event: StripeEvent): Promise<void> {
  // 1. Claim or detect duplicate
  const result = await this.inbox.claimOrInsert(
    'stripe',                    // source
    event.id,                    // externalEventId
    'charge.completed',          // eventName
    event,                       // payload for dedup
  );

  // 2. Process only if new
  if (result.wasClaimed) {
    try {
      await this.processCharge(event);
      await this.inbox.markProcessed(result.record.id);
    } catch (error) {
      await this.inbox.markFailed(result.record.id);
      throw error;
    }
  } else {
    // Duplicate detected - log and return
    logger.info('Duplicate event received', { source: 'stripe', eventId: event.id });
  }
}
```

**Guarantee**: Each unique external event processed at least once, never twice.
Inbox duplicate detection is keyed by `(source, externalEventId)` and is resilient to Prisma reporting that compound unique target in either canonical shape.

## Consumer Idempotency Requirements

- Must handle event replay (same event delivered multiple times)
- Must detect and skip duplicate processing by `idempotencyKey` or event ID
- Must log/track attempts for observability
- Must not fail silently on duplicate (log as INFO or DEBUG)
- Must maintain idempotent state updates (upsert patterns)

## Event Versioning

When payload structure changes:

1. Increment `eventVersion`
2. Publish new event name with higher version (e.g., v2)
3. Existing subscribers can handle multiple versions or migrate
4. Never break existing subscribers mid-flight

## Relay and Delivery

- **Not in Request Path**: External publication happens asynchronously via worker relay
- **Deferred Scope**: The relay worker itself remains out of scope until Task 007B
- **Guarantees**: At-least-once delivery (idempotency required at consumer)
- **Retry Policy**: Exponential backoff up to max attempts (default 10)
- Assessment attempt lifecycle events must use the attempt ID as `aggregateId`, must include real tenant/workspace context, and must describe learner runtime state only. In 011A they stop at attempt/result-placeholder boundaries; 011C adds separate grading-run and answer-grade events but still keeps result release, code execution, notebook execution, AI grading, and proctoring outside the current workflow.
- **Failed Events**: Tracked in outbox with status=FAILED for manual investigation

## Payload Size Limits

- Maximum 1MB per event (adjust based on requirements)
- Payload must be JSON-serializable
- No circular references or mutable objects
- Large binary data should be stored separately and referenced by URL/ID

- 2026-05-18: Task 011C1 validation confirmed grading runtime and outbox/inbox/audit Prisma enum/status alignment remains stable; root lint/typecheck/test/build passed.

## Task 011H Update (2026-05-19)

- Assessment attempt lifecycle retries must be event-idempotent at the business level:
  - no duplicate `assessment.attempt.started` for the same active retry path;
  - no duplicate `assessment.attempt.submitted` or `assessment.attempt.result.placeholder_created` on repeated submit;
  - no duplicate `assessment.result.released` on repeated release.
- Deterministic idempotency is local to the assessment lifecycle; no global execution-provider event stream was introduced.

## Communication Center

- Communication outbox events must include eventVersion `1`, tenantId, workspaceId, aggregateId, and only the minimum payload needed for downstream processing.
- Full recipient contact data should not be copied into event payloads unless strictly required.
- Event persistence through the outbox must be idempotent by `eventId`, including concurrent duplicate append attempts.
- Event payloads may include safe Communication provider identifiers, but must never include provider credentials, API keys, auth tokens, or raw transport request bodies.
- Provider enablement changes remain configuration concerns and are not emitted as public-facing domain events in Task 012E.

## Task 014A Additions

- Task 014A does not add a public bulk-send event or uncontrolled campaign fanout path.
- Campaign preview and scheduling foundation do not emit provider delivery events by default.
