# Database Standard

## General Rules

- **PostgreSQL** is the primary source of truth.
- **Prisma** is the mandated ORM for all backend TypeScript services.
- **UUIDs** must be used for all primary keys to ensure global uniqueness and prevent ID enumeration.
- **Timestamps**: Every table must include `createdAt` and `updatedAt`. Use `deletedAt` (nullable) for soft-delete requirements.

## Schema Modeling

- **Naming Conventions**: PascalCase for models (Prisma convention), camelCase for fields.
- **Enums**: Use enums for finite lifecycle states (e.g., `Status`, `Provider`, `OutboxMessageStatus`).
- **Normalized Structure**: Prefer relations over JSON for core business state to ensure referential integrity.
- **Tenant Scope**: Include `workspaceId` (UUID) in all tenant-scoped entities.

## Identity and Governance

- **Principal Separation**: Do not store passwords. Delegate authentication to IDPs.
- **Uniqueness**:

## Media rules

- Media metadata and upload intents may live in Postgres.
- Binary file payloads must not live in Postgres.
- Object keys must support tenant/workspace ownership checks and reject traversal patterns.
  - `Principal.email` must be unique.
  - `ExternalIdentity` must be unique on `[provider, externalId]`.
  - `Workspace.slug` must be unique.
  - `WorkspaceMember` must be unique on `[workspaceId, principalId]`.

## Audit Records

`AuditRecord` table persistence:

- All fields must be populated by `AuditRecorder` port + context enrichment
- **Never fabricate** tenant/workspace values (only use from context)
- `actorId` may be null for system-originated actions only
- `metadata` must be JSON-safe (validated at serialization)
- Immutable append-only (no updates or deletes)
- Indexes required on: `workspaceId`, `actorId`, `action`, `occurredAt`

## Outbox Messages

`OutboxMessage` table persistence:

- **Unique constraint** on `eventId` (prevents duplicate event persistence)
- If an insert collides on `eventId`, the repository returns the existing row rather than creating a duplicate, making producer retries idempotent.
- **Status lifecycle**: PENDING → PROCESSING → PUBLISHED or FAILED
- `attemptCount` starts at 0, incremented on relay failure
- `availableAt` used for scheduled retry (exponential backoff)
- `publishedAt` set only when status = PUBLISHED
- Indexes required on: `status`, `availableAt`, `createdAt`, `(workspaceId, status)`

Lifecycle expectations:

- Worker polls for PENDING messages where `availableAt` ≤ now
- Worker increments `attemptCount` and advances `availableAt` on failure
- After max attempts, status = FAILED for manual investigation
- No cleanup/deletion (audit trail via status history)

## Inbox Messages

`InboxMessage` table persistence:

- **Unique constraint** on `(source, externalEventId)` (dedup key)
- Prisma duplicate errors are handled by re-reading the existing `(source, externalEventId)` row, regardless of whether the ORM reports `source_externalEventId_key` or the raw compound field list.
- **Status lifecycle**: RECEIVED → PROCESSING → PROCESSED or FAILED
- `payloadHash` (SHA256 hex) used for change detection
- `idempotencyKey` optional additional dedup field
- Indexes required on: `status`, `receivedAt`, `(source, externalEventId)`

Deduplication rule:

- First occurrence of (source, externalEventId) → RECEIVED, process
- Subsequent occurrence → duplicate detected, skip processing
- Use `InboxRepository.claimOrInsert()` for atomic check-and-insert

## Migration and Evolution

- **Expand/Contract**: Mandatory for high-risk or destructive schema changes.
- **Rollback**: Every migration must be documented with a rollback strategy in the `build-ledger`.
- **Indexes**: Explicitly index lookup paths used in `where` clauses (Slug, Email, ExternalId, EventId, Status, AvailableAt).
- **No cascading deletes on audit/outbox/inbox**: These are immutable audit trails
- **Field removal**: Use deprecation + null-fill strategy before removal

## Transactions

- **Mandatory for Side Effects**: Any operation that mutates domain state AND records an audit log or publishes an outbox event MUST be wrapped in a transaction.
- **Transaction Boundary**: The boundary is controlled at the Application Layer (Use Case) using the `TransactionRunner` port.
- **Repository Support**: Every repository method used in a write path must accept an optional `TransactionContext` and use it to execute the query against the shared transactional client.
- **Rollback on Error**: Throwing any error inside the transaction closure must trigger an automatic rollback.
- **Precondition Check**: Domain preconditions and idempotency checks (reads that determine writes) should be performed inside the transaction where practical to prevent race conditions.
- **Verification**: All transaction-sensitive persistence logic must be verified against real Postgres integration tests (`*.integration.spec.ts`).
- **Content Studio 009B**: Published snapshots are immutable once written. Draft block replacement mutates only the current draft version state.

## Migrations and Schema Evolution

- **Committed Baseline**: Every schema change must be accompanied by a committed Prisma migration. Canonical history is stored in `backend/packages/data-platform/prisma/migrations/`.
- **Repeatable Deployment**: Migrations are applied via `prisma migrate deploy` in target environments.
- **Local Authoring**: Developers author migrations using `prisma migrate dev` against the local test database.
- **No Committed Generated Clients**: Prisma clients generated in `src/generated` or `node_modules` are build-time artifacts and MUST NOT be committed to version control.
- **Migration Scope Review**: A migration created for one domain MUST NOT silently carry unrelated Prisma drift edits for another domain. Content Studio 009B1 specifically removed accidental Learning Delivery DDL from the committed `add_content_studio` migration before validation.
- **Assessment Migration Scope Rule (010B1)**: `20260514145910_add_assessment_builder` was re-reviewed and cleaned so it contains Assessment-only DDL. Learning Delivery changes (constraints/defaults/index renames/table alters) are not permitted in Assessment migrations unless explicitly planned and documented with remediation strategy.
- **Assessment Attempt Migration Scope Rule (011A)**: `20260517070800_add_assessment_attempt_runtime` must remain attempt-runtime-only DDL. It may add attempt enums/tables/indexes/foreign keys, but it must not alter Learning Delivery, Content Studio, or other unrelated tables as migration drift.
- **Media Library Migration Scope Rule (012A1)**: `20260520083454_add_media_library` must remain Media Library-only DDL. Learning Delivery fixes were moved into `20260520160000_fix_learning_delivery_schema` to keep scope clean and auditable.

## Index Strategy

### Always Index

- UUID primary keys (auto-indexed)
- Foreign keys (included in Prisma relations)
- Unique constraints (auto-indexed)
- Outbox `status` and `availableAt` (polling queries)
- Inbox `status` and `(source, externalEventId)` (polling and dedup)
- Audit `workspaceId` and `occurredAt` (compliance queries)

### Consider Indexing

- Large text fields used in WHERE clauses
- JSON paths if used in WHERE (Postgres JSON operators)
- High-cardinality enum fields (status)
- Tenant-scoped compound indexes (workspaceId + status)

### Avoid Over-Indexing

- Rarely-queried fields (increases insert/update cost)
- Very high-cardinality unique fields (may hurt selectivity)
- Redundant indexes (Postgres query planner already uses best index)

## Data Types

- **UUIDs**: `@db.Uuid` (Postgres UUID type)
- **Dates**: `DateTime` (maps to `timestamp with time zone`)
- **JSON**: `Json` (Postgres JSONB)
- **Enums**: Prisma `enum` (becomes Postgres enum type)
- **Strings**: `String` (VARCHAR unlimited), specify `@db.Char(N)` for fixed-width
- **Integers**: `Int` (32-bit), `BigInt` (64-bit)
- **Decimals**: `Decimal` with `@db.Decimal(precision, scale)` for financial data

## Constraints and Validations

- **Not Null by default**: Explicitly mark `?` (optional) fields; required fields are not nullable
- **Unique constraints** via `@@unique([field1, field2])`
- **Foreign key constraints** via Prisma relations (ON DELETE CASCADE or RESTRICT)
- **Check constraints** for business rules (limit to Postgres-native logic)
- **Application-level validation** for complex business rules (not DB constraints)
- Assessment grading persistence is additive in 011C: answer-grade records are child records of grading runs, grading runs are child records of attempts, and deterministic ordering/indexes must support latest-run lookup plus workspace pending-manual-review queries.

- 2026-05-18: Task 011C1 validation confirmed grading runtime and outbox/inbox/audit Prisma enum/status alignment remains stable; root lint/typecheck/test/build passed.

## Task 011H Update (2026-05-19)

- Assessment reliability requires stable uniqueness for:
  - `AssessmentAttemptAnswer (attemptId, questionId)`
  - `AssessmentAttemptSession (attemptId)`
  - `AssessmentAttemptResult (attemptId)`
  - `AssessmentAnswerGrade (gradingRunId, answerId)`
- 011H adds a narrow database uniqueness guard for one active `IN_PROGRESS` attempt per learner/assessment to protect concurrent start retries.
- No unrelated schema churn or execution-provider schema changes are part of this task.

## Communication Center

- Communication Center schema additions are limited to notification templates, intents, delivery attempts, and supporting enums.
- Recipient and metadata JSON fields must remain JSON-safe and free of provider secrets.
- Outbox `eventId` uniqueness must not be weakened; duplicate append behavior should return the existing row rather than overwrite payload or suppress unrelated unique errors.
- Task 012E prefers no schema change; provider adapter prep must reuse existing Communication intent and delivery-attempt storage unless metadata requirements force otherwise.
- Delivery-attempt failure metadata must remain secret-free and safe to persist.

## Task 014A Additions

- Campaign persistence is limited to workspace-scoped draft/schedule metadata and typed audience configuration JSON.
- Campaign indexes must stay narrow: workspace plus status, created time, and scheduled time.
