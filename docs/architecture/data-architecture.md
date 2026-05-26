# Data Architecture

## Core Stores

- **PostgreSQL**: Source of truth for transactional product data (Identity, Workspace, Content, Assessments).
- **Redis**: Cache, locks, queue support, ephemeral coordination.
- **Object Storage (R2/S3-compatible)**: Media, artifacts, exports.
- **ClickHouse (later)**: Analytics warehouse and heavy rollups.

## Durable Audit, Outbox, and Inbox Tables

### AuditRecord

Immutable append-only audit log for compliance and security investigations.

Stores:

- **action**: What happened (e.g., 'workspace.member.added')
- **actorId**: Who did it (nullable for system actions)
- **targetType/targetId**: What changed

## Media storage note

- Media bytes are not stored in Postgres.
- Postgres stores only media metadata, upload intents, lifecycle state, and audit/outbox records.
- Object keys must remain tenant/workspace scoped.
- **tenantId/workspaceId**: Context (may be null for principal-scoped events)
- **requestId/correlationId**: Distributed tracing
- **metadata**: JSON additional context
- **occurredAt**: Business event timestamp
- **createdAt**: Record creation time

Indexes:

- `(workspaceId)` - query audit by workspace
- `(actorId)` - query audit by actor
- `(action)` - query by action type
- `(occurredAt)` - time-based queries

**Retention**: Audit records are immutable and never deleted. Retention policies (archival/deletion) are organizational concerns, not application concerns.

## Task 014D Update

- Assessment attempt reliability stayed on existing tables; no Prisma migration was required for 014D.
- Attempt/session expiry is enforced from persisted timestamps already present in the assessment attempt aggregate model.

### OutboxMessage

Durable event persistence for reliable cross-module and async distribution.

Stores:

- **eventId**: Unique event identifier (enforced unique constraint)
- **eventName/eventVersion**: Event schema metadata
- **payload**: JSON-safe event data
- **tenantId/workspaceId**: Optional context
- **correlationId**: Distributed tracing
- **idempotencyKey**: Optional dedup key
- **status**: PENDING|PROCESSING|PUBLISHED|FAILED
- **attemptCount**: Retry tracking
- **availableAt**: When next available for relay (supports scheduled/backoff retry)
- **publishedAt**: When successfully published to subscribers
- **occurredAt**: Business event timestamp
- **createdAt/updatedAt**: Lifecycle timestamps

Constraints & Indexes:

- Unique constraint on `eventId` - prevents duplicate event persistence
- Index on `status` - for relay polling queries
- Index on `availableAt` - for scheduled message discovery
- Index on `createdAt` - for audits and replay operations
- Compound index on `(workspaceId, status)` - tenant-scoped relay

**Lifecycle**: Messages transition PENDING → PROCESSING → PUBLISHED.
On relay failure, status returns to PENDING with `attemptCount++` and `availableAt` advanced for backoff.
After max attempts, status = FAILED for manual investigation.

Duplicate `eventId` inserts are idempotent: the repository returns the already-persisted row for producer retries instead of writing a second message.

**Adapter Rule**: Concrete outbox publisher adapters MUST forward the complete `OutboxEvent` envelope to the repository without reconstructing or dropping metadata. In particular, `idempotencyKey` and other envelope fields must be preserved exactly as provided by the caller so deduplication and idempotency guarantees remain intact.

### InboxMessage

Idempotent inbound external event deduplication.

Stores:

- **source**: External source identifier (e.g., 'stripe', 'slack')
- **externalEventId**: Source-provided event ID
- **eventName**: Internal event name mapped from source
- **idempotencyKey**: Additional optional dedup key
- **payloadHash**: SHA256 hash of payload for change detection
- **status**: RECEIVED|PROCESSING|PROCESSED|FAILED
- **receivedAt**: Inbound receipt timestamp
- **processedAt**: When successfully processed
- **createdAt/updatedAt**: Lifecycle timestamps

Constraints & Indexes:

- Unique constraint on `(source, externalEventId)` - dedupe key
- **Index on `status`** - for worker polling
- **Index on `receivedAt`** - for time-based recovery

**Deduplication Rule**: First inbound event with a given (source, externalEventId) claims the inbox slot.
Subsequent identical events are detected as duplicates and can be skipped or logged.

Inbox duplicate detection is keyed on `(source, externalEventId)` and the repository re-reads the existing row after unique-constraint failures.

**Idempotency Pattern**:

1. Consumer calls `InboxRepository.claimOrInsert(source, externalEventId, ...)`
2. If new: record created with RECEIVED status, `wasClaimed=true`
3. If duplicate: existing record returned, `wasClaimed=false`
4. Consumer processes only if `wasClaimed=true` or retrying a failed record

### Assessment Builder Models

Flexible assessment and exam authoring state with versioning and immutable snapshots.

Models:

- **Assessment**: Root aggregate for an assessment/exam. Stores settings, policies (attempt, time limit, result release), and metadata.
- **AssessmentVersion**: Incremental draft/published versions of an assessment.
- **AssessmentSection**: Named groupings of questions within a version.
- **AssessmentQuestion**: Individual questions. Supports 10 kinds (MCQ, ShortText, Code, etc.) with kind-specific prompt/options/answer schemas.
- **AssessmentGradingRubric**: Reusable rubrics for subjective or complex grading.
- **AssessmentGradingRule**: Specific automated or manual rules for scoring questions.
- **AssessmentPublishedSnapshot**: Immutable, flattened JSON snapshot of a version at the moment of publication, optimized for high-performance delivery.

**Persistence Pattern**:

- **Full-Replacement Drafts**: Saving a draft assessment replaces all draft sections and questions to simplify complex tree-reordering and diffing.
- **Flattened Snapshots**: Published snapshots store the entire assessment structure in a single row to minimize joins during high-concurrency learner delivery.
- **Ordered Result Sets**: Sections and questions are always queried with deterministic `orderBy: { position: 'asc' }`.
  125: ## ORM and Migrations

- **Prisma**: The TypeScript ORM boundary.
- **Migration Style**: Explicit expand/contract rollout plans. Avoid destructive migrations without backward-compatible staging.
- **Schema Evolution**: Use field aliasing and gradual deprecation patterns.

The repository maintains strict isolation between development and testing persistence:

- **Development Database**: `mentrily` (port 5432). Used for local development and manual testing.
- **Integration Test Database**: `mentrily_test` (port 5433). Dedicated, volatile database used exclusively for integration tests.

**Rules for Integration Persistence**:

- **Isolation**: Never run integration tests against the development database.
- **Cleanup**: `truncatePublicSchema` must run between every test to ensure state isolation.
- **Cleanup Safety**: `truncatePublicSchema` acquires an advisory lock to serialize cleanup across concurrent integration runs.
- **Automation**: `automation/run-integration-tests.mjs` is the source of truth for integration runs. It fails fast on any error and prohibits false success reporting.
- **Repeatability**: Integration tests must be safely repeatable and must not depend on pre-existing data (except baseline migrations).
- **Generated Clients**: Prisma clients generated during tests reside in `node_modules` and are NEVER committed to version control.
- **Content Studio 009B1**: The schema includes `ContentDocument`, `ContentVersion`, `ContentBlock`, and `ContentPublishedSnapshot`, and the committed Content Studio migration was reviewed to ensure it does not silently alter Learning Delivery tables.
- **Assessment Delivery 011A**: The schema now also includes `AssessmentAttempt`, `AssessmentAttemptAnswer`, `AssessmentAttemptSession`, and `AssessmentAttemptResult` for learner runtime persistence. Attempt records reference published assessment snapshots and remain separate from Assessment Builder draft/version authoring records.
- **Assessment Delivery 011G**: Execution runtime uses no persistence yet. Execution requests/results stay in-memory inside the configured provider adapter for safe tests/internal harness flows, so no new Prisma tables or migrations were added in 011G.
- **Content Studio 009D**: browser E2E persists through the same real Content Studio tables in the dedicated test database. The E2E runner rejects non-test database names before starting.

## Multi-tenant Isolation

- **Tenant Sovereignty**: Resource access is strictly scoped to `workspaceId`.
- **Identity Isolation**: `Principal` records are global but their access is scoped through `WorkspaceMember` links.
- **Audit/Outbox Context**: Tenant/workspace fields on audit/outbox records enable tenant-scoped queries for compliance.
- **Free Accounts**: Support for users without a workspace membership exists for personal/individual paths.

## Relational Modeling

- **Normalized Identity**: Principal entities are separated from external identity provider (Clerk) links to support multi-provider evolution.
- **Role/Permission Mapping**: Normalized relational structure for roles and permissions to ensure auditability and flexibility beyond simple strings.
- **Indexes**: Strategic indexing on `externalId`, `slug`, `domain`, `workspaceId`, and `eventId` for high-performance lookups.

## Reliability Patterns

- **Outbox Pattern**: For cross-module and async consistency (persisted to `OutboxMessage`)
  - Write state + event in same transaction
  - Relay worker polls and distributes externally
  - Failures tracked in `attemptCount` and `status`
  - Duplicate `eventId` retries return the existing record

- **Inbox Pattern**: For inbound external idempotency (persisted to `InboxMessage`)
  - Deduplicate by (source + externalEventId)
  - Process once per unique external event
  - Failures tracked in status
  - Unique-constraint retries rehydrate the existing `(source, externalEventId)` row

- **Audit Logs**: Integrated via `AuditRecorder` for privileged operations (persisted to `AuditRecord`)
  - Immutable append-only
  - Context enrichment (request ID, correlation ID, tenant/workspace)
  - Enables compliance investigations and security reviews

Repository ownership is exposed through `DataPlatformModule`, which provides `PrismaService`, `AuditRecordRepository`, `OutboxRepository`, and `InboxRepository`.

- **Idempotency**: Policy-enforced on all mutating APIs and worker consumers
  - Deterministic idempotency keys (not random UUID)
  - Inbox deduplication by (source + externalEventId)
  - Outbox unique constraint on eventId

## Transaction Safety

All mutations to the source-of-truth stores MUST be transactional when they involve side effects like audit logs or outbox events.
Content Studio 009B1 follows this rule for create, rename, replace-blocks, publish, archive, and restore flows.

Content Studio 009B1 validation also requires direct HTTP integration coverage for those backend routes. The API integration suite must go through the real Nest/Fastify app and real Postgres database rather than calling use cases as a fallback.
Assessment Delivery backend persistence/API and frontend builder authoring UI now both exist. The first cross-stack Assessment Builder E2E also exists and runs against the real frontend, real backend, and dedicated test Postgres database. Learner attempt runtime now includes backend persistence/API, learner-safe published snapshot reads, learner frontend routes, and attempt Playwright E2E. Grading runtime foundation now adds `AssessmentGradingRun` and `AssessmentAnswerGrade` persistence so submitted attempts can be scored and tracked without mutating authoring drafts.
Attempt runtime reads published snapshot records only and does not mutate or expose Assessment Builder draft/version state.
Assessment Delivery is not linked to Learning Delivery runtime flows yet, and Assessment persistence is not directly linked to Content Studio persistence in this slice.
Execution request/result persistence remains intentionally deferred; 011G keeps execution state inside the safe provider boundary until a real isolated worker/provider is introduced behind a feature flag.

### TransactionRunner

The `TransactionRunner` (implemented via `PrismaTransactionRunner`) ensures that:

- **Atomicity**: The domain state change, the `AuditRecord` append, and the `OutboxMessage` append are committed in a single database transaction.
- **Isolation**: Concurrent operations on the same data are handled according to database isolation levels (defaulting to Read Committed).
- **Consistency**: Reads used to decide a write (e.g., checking if a slug exists or a role is valid) are performed within the transaction where practical to prevent race conditions.

### Usage Pattern

```typescript
await transactionRunner.run(async (tx) => {
  // 1. Read existing state
  const existing = await repository.findById(id, tx);

  // 2. Perform mutation
  await repository.save(newData, tx);

  // 3. Side effects
  await auditRecorder.record(auditInput, context, tx);
  await outboxPublisher.publish(eventInput, context, tx);
});
```

All repositories, the `AuditRecorder`, and the `OutboxPublisher` accept an optional `TransactionContext` to participate in the shared transaction. If omitted, they fallback to a standard non-transactional client.

**Important Type Safety Rule**: `TransactionContext.client` is intentionally typed as `unknown` in shared contracts (like `@mentrily/service-core`) so domain layers are not coupled to Prisma. Data-platform code MUST NOT access `tx.client` directly. Instead, data-platform code must resolve the client using the transaction helper:
`import { getPrismaClient } from '../transactions/transaction-client.js';`

## Performance Considerations

- Outbox/inbox queries are indexed by status for efficient polling
- Audit records are append-only (no deletion triggers contention)
- Payload JSON fields are indexed for common queries in Postgres
- Consider archive/purge strategies for old audit records (not implemented in task 007A)
- Worker relay remains deferred to Task 007B.

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

## Assessment Result Release Data

Result release reuses the existing `AssessmentAttemptResult` record with `gradingStatus = RELEASED` and `releasedAt`. No learner-only result table is required for the initial workflow.

## Task 011H Update (2026-05-19)

- Assessment reliability now relies on existing uniqueness for:
  - one session per attempt,
  - one result per attempt,
  - one answer per `(attemptId, questionId)`,
  - one answer grade per `(gradingRunId, answerId)`.
- 011H adds a narrow DB guard for one active `IN_PROGRESS` attempt per learner/assessment to support retry-safe concurrent starts.
- No execution-provider persistence changes were added. Real code execution remains deferred.

## Task 011I Update (2026-05-20)

- Task 011I required no schema or migration changes.
- Existing assessment question JSON continues to carry reading-passage content and file-upload placeholder metadata.
- Existing attempt-answer JSON remains sufficient for placeholder file-upload answers shaped as `fileIds: string[]`.
- Media Library schema, asset persistence, object storage adapters, and signed URL models are still future work.

## Task 012B Update (2026-05-21)

- Media asset metadata continues to live in Postgres while file bytes remain outside Postgres in object storage.
- Portal uploads still use signed object-storage URLs; the 012B frontend work does not change storage persistence boundaries.

## Communication Center

- Postgres now persists `NotificationTemplate`, `NotificationIntent`, and `NotificationDeliveryAttempt`.
- Recipient addressing and metadata live in JSON fields; provider secrets are not stored.
- Delivery-attempt persistence is present for future worker/provider tasks even though 012C does not perform real sends.
- `OutboxMessage.eventId` remains unique and now acts as a strict append-time idempotency key.
- `NotificationDeliveryAttempt` uniqueness on `(intentId, attemptNumber)` is used by the internal scheduler as a race-safe claim boundary.
- Task 012E keeps Communication provider configuration out of persisted public contracts.
- Notification intents and delivery attempts may record provider-disabled failures, but no provider secrets, API keys, or raw transport credentials are stored.

# Communication Inbox Data Model

- `NotificationIntent` remains the source of truth for in-app inbox records; no separate inbox table is required for `012F`.
- `NotificationPreference` remains the source of truth for workspace-scoped user notification preferences.
- Inbox read/archive state is stored in sanitized metadata and returned through frontend-safe DTO mapping only.

## Task 014A Additions

- Introduced a workspace-scoped `Campaign` persistence model with narrow status and scheduling metadata.
- Dashboard reads remain aggregate queries over existing learning, assessment, content, media, audit, and campaign tables.
- No provider credentials, storage keys, or scanner payloads are persisted in dashboard or campaign contracts.

## Task 014E Additions

- Added `AssessmentProctoringSession` and `AssessmentProctoringEvent` as explicit workspace-scoped persistence models.
- Proctoring events store only sanitized metadata summaries and indexed identifiers for workspace, attempt, assessment, learner, session, type, and time.
- Duplicate event ingestion is bounded by a `(workspaceId, sessionId, eventId)` uniqueness rule when an idempotency key is provided.

## Task 014F Additions

- Added `AssessmentProctoringIncident`, `AssessmentProctoringIncidentEvent`, and `AssessmentProctoringIncidentReviewAction` to the PostgreSQL schema.
- Proctoring incidents model the integrity status of a proctored assessment attempt, grouping multiple telemetry events.
- Workspace data isolation is enforced via compound foreign keys and indexes ensuring all incident entities align strictly with the tenant workspace boundary.
- Incident review logs track status transitions and manual notes transactionally using NestJS's `TransactionRunner` wrapper.
