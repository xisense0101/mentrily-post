# Event Model

## Canonical Domain Event Envelope

All domain events follow a standardized envelope structure for reliable, idempotent distribution:

```typescript
interface DomainEventEnvelope {
  eventId: string; // Globally unique event ID (UUID)
  eventName: string; // Versioned name (e.g., 'identity.membership.granted.v1')
  eventVersion: number; // Payload schema version
  occurredAt: string; // ISO 8601 timestamp of business event
  correlationId: string; // Distributed trace correlation ID
  tenantId?: string; // Workspace context (may be null for principal-scoped)
  workspaceId?: string; // Workspace context (may be null for principal-scoped)
  idempotencyKey?: string; // Deterministic dedup key (not random)
  payload: TPayload; // Event-specific data (JSON-safe)
}
```

### Event Naming

Versioned semantic names:

- Format: `{domain}.{section}.{topic}.v{N}`
- Examples:
  - `identity.membership.granted.v1`
  - `commercial.entitlement.changed.v1`
  - `learning.enrollment.created.v1`
  - `workspace.provisioned.v1`

Domains:

- `identity`: Principal/user identity and session events
- `workspace`: Workspace lifecycle and governance
- `commercial`: Plans, entitlements, billing
- `content`: Content creation and mutation
- `learning`: Enrollment, progress, completion
- `assessment`: Assessment delivery, scoring
- `credentialing`: Badge/credential issuance
- `communication`: Email, SMS, notifications
- `integration`: Third-party webhook/sync events

## Task 014D Update

- Assessment attempt submit retries must not duplicate downstream grading or result side effects.
- Existing outbox idempotency remains the protection boundary for duplicate learner submit paths.
- `intelligence`: Analytics, data pipeline events

### Current content domain event names

- `content.document.created`
- `content.document.renamed`
- `content.document.draft_blocks_replaced`
- `content.document.published`
- `content.document.archived`
- `content.version.created`
- `content.version.published`
- `content.snapshot.created`

### Assessment domain event names (010A)

- `assessment.created`
- `assessment.renamed`
- `assessment.content_replaced`
- `assessment.published`
- `assessment.archived`
- `assessment.restored_to_draft`
- `assessment.version.created`
- `assessment.version.published`
- `assessment.snapshot.created`
- `assessment.question.added`
- `assessment.question.updated`
- `assessment.grading_rule.updated`

### Assessment attempt event names (011A)

- `assessment.attempt.started`
- `assessment.attempt.answer_saved`
- `assessment.attempt.submitted`
- `assessment.attempt.expired`
- `assessment.attempt.cancelled`
- `assessment.attempt.result.placeholder_created`

These 011A events are backend/runtime lifecycle events only. They are persisted through the outbox model with tenant/workspace context and attempt aggregate IDs, but they do not yet imply grading execution, result release, code execution, or proctoring workflows.

011B adds learner frontend and cross-stack E2E coverage only. It does not add new attempt event names. Submission still ends at the placeholder result event boundary; grading runtime/worker, result release workflow, code execution, and proctoring event flows still do not exist.

### Assessment grading event names (011C)

- `assessment.grading.run.started`
- `assessment.grading.run.completed`
- `assessment.grading.run.partial`
- `assessment.grading.run.failed`
- `assessment.answer.auto_graded`
- `assessment.answer.pending_manual_review`
- `assessment.answer.manually_graded`
- `assessment.attempt.result.updated`

These 011C events are backend grading-runtime foundation events only. They must carry real tenant/workspace context, use grading-run IDs for grading-run aggregates and attempt IDs for result updates, and they still do not imply result release, code execution, notebook execution, AI grading, or proctoring workflows.

Execution runtime prep/adapters (011F–011G) do not add execution job events yet. The safe noop/fixture provider boundary is synchronous and internal-only, so no execution request/result events are emitted yet.

Note: In 010A these are domain event factories only. Outbox persistence and async relay begin in 010B.

### Idempotency Rule

`idempotencyKey` is set by the producer and must be **deterministic**, not random.

Format recommendation:

```
{workspaceId}:{entityType}:{entityId}:{action}:{occurredAtTimestamp}
```

Example:

```
ws-001:workspace_member:member-123:added:2026-05-11T10:30:00Z
```

Consumers deduplicate by `idempotencyKey` within a bounded time window (e.g., 24 hours).

## Outbox Pattern

The Outbox Pattern ensures reliable event delivery and cross-module consistency.

Producer writes the event to the `OutboxMessage` table **in the same transaction** as the domain state change using the `TRANSACTION_RUNNER`. This ensures that either both the state change and the event are committed, or neither is.

Duplicate `eventId` inserts are idempotent: if a producer retry hits the unique constraint, the repository returns the existing outbox record instead of creating a second row.

Lifecycle:

1. **PENDING**: Awaiting relay to subscribers
2. **PROCESSING**: Currently being relayed by worker
3. **PUBLISHED**: Successfully delivered to all subscribers
4. **FAILED**: Relay permanently failed (check `attemptCount` vs retry policy)

### Outbox Fields

```sql
id (UUID)                 -- Unique message ID
eventId (string)          -- Business event ID (unique constraint)
eventName (string)        -- Event name
eventVersion (int)        -- Payload schema version
tenantId (UUID, nullable) -- Workspace context
workspaceId (UUID, nullable)
correlationId (string)    -- From RequestContext
idempotencyKey (string, nullable) -- Deterministic dedup
payload (JSON)            -- Full event envelope payload
occurredAt (timestamp)    -- Business event timestamp
status (enum)             -- PENDING|PROCESSING|PUBLISHED|FAILED
attemptCount (int)        -- Number of relay attempts
availableAt (timestamp)   -- When message is available for polling (futures for backoff)
publishedAt (timestamp, nullable) -- When successfully published
createdAt (timestamp)
updatedAt (timestamp)
```

### Indexes

- Unique on `eventId` (for idempotency)
- Index on `status` (for polling)
- Index on `availableAt` (for scheduled retry)
- Index on `createdAt` (for replay/audits)
- Compound index on `(workspaceId, status)` (for tenant-scoped queries)

## Inbox Pattern

Subscriber persists inbound external events to `InboxMessage` table for idempotent processing.

Idempotency rule: Deduplicate by `(source + externalEventId)` tuple.

Prisma duplicate errors for the inbox are handled by re-reading the existing `(source, externalEventId)` record, regardless of whether the ORM reports the compound unique target as `['source_externalEventId_key']` or `['source', 'externalEventId']`.

Lifecycle:

1. **RECEIVED**: Inbound event received and stored
2. **PROCESSING**: Currently being processed
3. **PROCESSED**: Successfully processed and committed
4. **FAILED**: Processing failed (check error logs)

### Inbox Fields

```sql
id (UUID)                 -- Unique inbox record ID
source (string)           -- External source (e.g., 'stripe', 'slack')
externalEventId (string)  -- Source-provided event ID
eventName (string)        -- Internal event name mapped from source
idempotencyKey (string, nullable) -- Additional dedup key
payloadHash (string)      -- SHA256 hash of payload (change detection)
status (enum)             -- RECEIVED|PROCESSING|PROCESSED|FAILED
receivedAt (timestamp)    -- Receipt timestamp
processedAt (timestamp, nullable) -- When successfully processed
createdAt (timestamp)
updatedAt (timestamp)
```

### Indexes & Constraints

- Unique constraint on `(source, externalEventId)` (dedupe key)
- Index on `status` (for polling workers)
- Index on `receivedAt` (for time-based queries)

## Eventual Consistency

Cross-module read models may lag briefly behind writes:

- Event latency: typically < 100ms in normal conditions
- Design UX and APIs for **bounded eventual consistency**
- Queries that must reflect immediate writes should query the domain module directly
- Background dashboards can consume from eventual-consistency read models

## External Publication (Worker Relay)

External publication is **deferred to worker relay processes**, not inline in request paths:

1. Request writes state + persists event to outbox (**transactional**)
2. Response returned to client (synchronous path complete)
3. Worker relay polls outbox PENDING messages (**async**)
4. Worker distributes to external subscribers (Kafka, webhooks, etc.)
5. Consumer persists to inbox and processes idempotently

Content Studio 009B1 uses this same rule for:

- `content.document.created`
- `content.document.draft_blocks_replaced`
- `content.document.published`
- `content.snapshot.created`
- `content.document.archived`
- `content.document.restored`

Worker claim methods must defensively hard-cap returned records to the requested batch size and must utilize conditional status transitions (e.g., `updateMany` checking `status: PENDING`) to ensure atomicity in multi-worker environments.

The worker relay remains intentionally deferred to Task 007B.

This maintains:

- Request/response synchronicity
- Domain transaction boundaries
- Decoupling from external system availability
- Retry/resilience policies separate from business logic

## Delivery Reliability

1. **Outbox persistence**: guarantees event is recorded even if relay fails
2. **Worker relay**: retries with exponential backoff and max attempt limits
3. **Inbox deduplication**: ensures idempotent reprocessing on retry
4. **Status tracking**: enables operational visibility and recovery

## Event Versioning

When payload structure changes:

1. Increment `eventVersion`
2. Publish new event name with higher version (e.g., v2)
3. Subscribers can handle multiple versions or migrate gracefully
4. Never break existing subscribers mid-flight

- 2026-05-18: Task 011C1 validation confirmed grading runtime and outbox/inbox/audit Prisma enum/status alignment remains stable; root lint/typecheck/test/build passed.

## Task 011D Update (2026-05-18)

- Manual grading UI now exists for creator/admin review.
- Creator/admin can view pending manual-review answers, open grading runs, and submit manual score + feedback.
- Learner result page is not implemented yet.
- Result release workflow is not implemented yet.
- Code execution grading, notebook execution grading, AI grading, and proctoring are not implemented yet.
- Learning Delivery is not connected to Assessment grading.
- Content Studio is not connected to Assessment grading.
- Grading E2E uses real frontend + real backend + test Postgres.

## Assessment Result Events

The assessment delivery domain now emits `assessment.result.released`. A `assessment.result.viewed` event factory exists for future auditing, but the initial learner read flow does not emit it on every refresh.

## Task 011H Update (2026-05-19)

- Assessment lifecycle retries now have explicit event expectations:
  - repeated start on the same active attempt must not publish a second `assessment.attempt.started`;
  - repeated submit on an already-submitted attempt must not publish duplicate `assessment.attempt.submitted` or `assessment.attempt.result.placeholder_created`;
  - repeated release must not publish duplicate `assessment.result.released`.
- Real execution-provider events still do not exist. 011F/011G were safe execution-prep only.

## Communication Center

- Communication Center publishes workspace-scoped outbox events for template creation/activation/archive and intent creation/queue/dispatched/failed/cancelled lifecycles.
- Communication events do not include provider secrets and avoid unnecessary recipient-detail leakage.
- Duplicate outbox appends resolve to the existing row by `eventId`, so communication lifecycle event persistence is deterministic under retries and simple concurrency.
- Task 012E does not add any new public provider events.
- Communication events may continue to carry provider mode identifiers, but must not expose provider secrets, raw transport payloads, or credential material.
