# Backend Architecture

## Layered module model

Each domain module uses:

- `presentation/`: transport controllers, DTO validation, request/response mapping.
- `application/`: use-case orchestration, commands/queries, transactional policies.
- `domain/`: entities, value objects, domain services, invariants.
- `infrastructure/`: ORM repositories, provider adapters, queue/event bridges.
- `tests/`: module-level unit/integration/contract tests.

## Identity and Authorization Strategy

- **Principal Sovereignty**: Mentrily owns the `Principal` domain entity; Clerk is treated as an external identity source linked via `ExternalIdentity`.
- **Permission-Based**: All authorization checks are performed against granular permission keys (e.g., `workspace.members.manage`).
- **Context-Aware**: Authorization decisions leverage `RequestContext` and `WorkspaceContext` to ensure tenant isolation and correct principal context.
- **Subject-Aware Entitlements**: Entitlement evaluation requires an explicit subject and supports both workspace-scoped (`workspaceId`) and principal-scoped (`principalId`) evaluation.
- **Type-Enforced Subjects**: Entitlement evaluation inputs without `subject` are compile-time type errors, not only runtime denials.
- **Experience Fluidity**: The system supports switching between learner and creator experiences based on current permissions/context without requiring separate accounts.

## Media Library slice

- Media Library follows the same layered module pattern as other backend domains.
- Object storage is behind an adapter boundary; the default binding is noop and tests use a deterministic fixture adapter.
- **Fail-Closed**: Evaluators must deny by default if a concrete policy or entitlement is not found.

## Commands and queries

- Commands mutate state and enforce idempotency.
- Queries are optimized reads and avoid hidden side effects.
- Privileged admin command use cases must validate authorization preconditions before any mutation or side effect (persistence, audit, outbox).
- Explicitly modeled onboarding flows may use non-admin authorization sources (for example, verified invitation tokens) when domain contracts define that boundary.
- Onboarding flows must also validate critical domain preconditions before mutation (for example, invited role existence) to avoid partial writes on terminal validation failures.
- Permission checks remain workspace-context-driven, while entitlement checks may be principal-scoped or workspace-scoped based on product subject.

## Repositories and adapters

- Repositories abstract persistence details.
- Provider integrations are behind ports/adapters.
- Communication Center provider selection is now backend-only configuration resolved through a registry/factory boundary.
- `NOOP` remains the safe default provider, fixture remains test-only, and reserved email/SMS adapters stay disabled unless future work explicitly enables live delivery.
- `DataPlatformModule` owns the durable repositories and exports `PrismaService`, `AuditRecordRepository`, `OutboxRepository`, and `InboxRepository`.

## Cross-cutting requirements

- Audit logs for privileged and security-relevant actions.
- Idempotency keys or deterministic dedupe on writes.
- Explicit tenant isolation in every data access path.
- Transactional write safety and eventual consistency across modules.

All write operations follow a consistent transactional pattern. In the current implementation, all onboarding and workspace-governance write paths (including member management and invitation lifecycle) use this pattern to ensure atomicity.

```
1. Request arrives at presentation layer (controller)
   ├─ Validate input DTOs
   ├─ Extract and normalize RequestContext
   └─ Enrich with correlation ID, tenant/workspace context

2. Application layer (use case) executes
   ├─ Authorize (permission check or verified token validation)
   ├─ Validate preconditions (entitlements, domain rules)
   ├─ Open transaction via TRANSACTION_RUNNER
   ├─ Inside transaction:
   │  ├─ Perform reads that determine writes (idempotency/guard checks)
   │  ├─ Execute domain logic and mutation (via repositories)
   │  ├─ Record audit log (via AUDIT_RECORDER)
   │  └─ Emit domain event (to OUTBOX_PUBLISHER)
   └─ Return result

3. Transactional boundary guarantees
   ├─ Atomic commit: State mutation, outbox event, and audit record are either all committed or all rolled back.
   ├─ Consistency: Invariants are checked within the same transaction where practical.
   └─ Safety: Verified-token onboarding flows (e.g., Invitation Acceptance) are transactionally isolated and safe without using privileged admin use cases.

4. Response returned synchronously
   └─ Client receives confirmation

5. Async relay (outside request path)
   ├─ Worker polls OutboxMessage table for PENDING events
   ├─ Distributes to external subscribers (Kafka, webhooks, etc.)
   ├─ Updates status: PENDING → PROCESSING → PUBLISHED
   └─ Tracks failures and retries
```

**Key invariants**:

- No domain side effects outside the request transaction
- No external service calls within the write path (deferred to workers)
- Event persistence guaranteed even if external relay fails
- Audit logs immutable and append-only

## Audit, Outbox, and Inbox Ports

### AuditRecorder (Port)

**Dependency**: Injected via `@Inject(AUDIT_RECORDER)` token

**Responsibility**: Record privileged/security-relevant actions

**Concrete Implementation**: `PrismaAuditRecorder`

- Accepts `AuditRecordInput` from use case
- Enriches with `RequestContext` (correlation ID, tenant/workspace, request ID)
- Persists to `AuditRecord` table durably
- Never silently swallows errors; throws on persistence failure

### OutboxPublisher (Port)

**Dependency**: Injected via `@Inject(OUTBOX_PUBLISHER)` token

**Responsibility**: Persist domain events for async distribution

**Concrete Implementation**: `PrismaOutboxPublisher`

- Accepts `OutboxEvent` from use case
- Enriches with `RequestContext` (correlation ID)
- Persists to `OutboxMessage` table durably
- Initializes status = PENDING for worker relay
- Never publishes externally (relay is asynchronous)
- MUST preserve the complete original `OutboxEvent` envelope (including `idempotencyKey`) when forwarding to the repository; adapters must not reconstruct or drop envelope metadata.

### InboxRepository (Direct Dependency)

**Responsibility**: Deduplicate inbound external events

**Usage**: Imported directly in integration/webhook handlers

- Claim or insert (`source`, `externalEventId`)
- Returns `InboxClaimResult` indicating if new or duplicate
- Process only if `wasClaimed=true` to ensure idempotency

Duplicate insert retries are handled by the repository itself, including Prisma compound-unique target variations.

### TransactionRunner (Port)

**Dependency**: Injected via `@Inject(TRANSACTION_RUNNER)` token

**Responsibility**: Execute multiple repository operations within a single atomic database transaction.

**Concrete Implementation**: `PrismaTransactionRunner`

- Provides a `run()` method accepting a closure.
- Passes a `TransactionContext` containing a scoped Prisma client to the closure.
- Ensures all operations within the closure (mutation, audit, outbox) share the same underlying transaction.
- Automatically handles commit on success and rollback on error.
- Enriches the transaction with a unique correlation ID if not already present.

## Assessment Builder domain slice

**010A–010B2 state**: Assessment domain foundation is complete with full Prisma persistence, migrations, repository adapters, application use cases, HTTP controllers, and API integration test coverage. Assessment Builder domain does not import Content Studio or Learning Delivery domain objects (boundary enforced).

- All assessment entities, value objects, policies, and events are in `backend/applications/platform-api/src/modules/assessment-delivery/domain/`.
- Prisma repositories and adapters handle create, read, publish, archive, restore, and snapshot operations.
- HTTP controllers validate tenant/workspace context, permissions, and audit requirements.
- Full integration test coverage proves APIs work through real backend with test Postgres.
- Assessment domain is safe for reuse by other modules that need question/grading logic (e.g., future LMS integrations).

**010C–010C2 state**: Assessment Builder frontend authoring shell is complete with creator-side full draft/publish/archive/restore lifecycle support through the real backend API.

- The first Assessment Builder cross-stack E2E proof now exists and runs the real portal UI, real `platform-api` backend, and real test Postgres database.

**011C–011G state**: Assessment Builder authoring remains proven end to end, learner attempt backend and learner attempt frontend/E2E both exist, grading runtime foundation exists on the backend, result release exists, and assessment-delivery now exposes backend-only code execution request/get/cancel use cases behind a safe provider port. Submitted attempts can be graded synchronously into persisted grading runs and answer-grade records, but code/notebook grading still does not execute source.

## Foundation runtime conventions

- Shared foundation contracts are provided through `@mentrily/service-core` ports (`PermissionEvaluator`, `EntitlementEvaluator`, `AuditRecorder`, `OutboxPublisher`, `TransactionRunner`).
  - Concrete durable implementations (`PrismaAuditRecorder`, `PrismaOutboxPublisher`, `PrismaTransactionRunner`) are available via `@mentrily/data-platform`.
- Request metadata is normalized into `RequestContext`, with optional `WorkspaceContext` when tenant/workspace headers are present.
- Correlation and request IDs are enforced at API ingress and returned via `x-request-id` and `x-correlation-id` headers.
- Runtime environment values are validated during bootstrap before application listen.
- Shared typed error envelopes are produced through a global exception filter with `AppError` semantics.
- Health and readiness endpoints are implemented as foundation concerns, not domain features.

## Module Wiring

Foundation module (`FoundationModule`) provides:

- Concrete audit/outbox adapters (`PrismaAuditRecorder`, `PrismaOutboxPublisher`) via `@mentrily/data-platform`
  - The foundation module does not own repository providers directly; it imports `DataPlatformModule` instead.
- Default fail-closed implementations for `PermissionEvaluator` and `EntitlementEvaluator` (real implementations provided by future tasks)
- `PLATFORM_ENVIRONMENT` configuration
- Global exception filter

Domain modules import `FoundationModule` and inject evaluation/audit/outbox ports as needed.

## Learning Delivery

- The Learning Delivery backend slice is implemented with real HTTP controllers, application use cases, Prisma-backed repositories, and integration coverage.
- The first cross-stack Learning Delivery E2E slice now exercises the real backend through Playwright-driven frontend flows against the dedicated test Postgres database.
- Backend request context remains ingress-driven. For current Learning Delivery E2E only, test code may inject `x-request-id`, `x-correlation-id`, `x-tenant-id`, `x-workspace-id`, and `x-actor-id` headers to simulate workspace context until production auth/session wiring is complete.
- This test-only context injection does not bypass real backend logic and does not weaken the production fail-closed permission or entitlement defaults.

Key rules:

- Domain code MUST NOT import Prisma or infrastructure persistence.
- Domain-only unit tests MUST be DB-free.
- Backend integration and E2E runs MUST target only the dedicated test database.

## Content Studio

- `content-studio` now has Prisma-backed repositories, application use cases, and HTTP controllers for the reusable block-document authoring surface.
- Mutating Content Studio flows wrap state changes, audit writes, and outbox writes in one transaction.
- Content Studio events are persisted to the outbox and are not externally published from the request path.
- Content Studio API integration coverage now proves the HTTP layer directly through the real Nest/Fastify app instead of using use-case fallbacks inside the spec.
- The domain model is shared infrastructure for future course builder, lesson builder, and assessment/question builder flows.
- This avoids creating separate authoring foundations for learning content and future exams while keeping the current slice isolated from Learning Delivery and Assessment Delivery persistence.
- Learning Delivery is still not linked directly to Content Studio documents in 009B1.
- The first cross-stack Content Studio E2E slice now boots the real backend app and runs Playwright against the real portal and real test Postgres database.
- Test-only request context for browser E2E is still ingress-driven through the existing request headers and remains gated behind `NEXT_PUBLIC_E2E_TEST_MODE=true`; this is not production-complete auth/session wiring.
- Backend production behavior remains fail-closed: missing workspace context still errors, and cross-workspace access still resolves as not found.

## Persistence Verification

Transactional write paths are verified through a dual-testing strategy:

- **Unit Tests**: Mock-driven, fast validation of business logic and transactional boundary orchestration.
- **Integration Tests**: Real Postgres-driven validation of database mutations, transaction rollbacks, and audit/outbox/inbox persistence.
  - Tests run against a dedicated `mentrily_test` database.
  - The `automation/run-integration-tests.mjs` runner ensures a truthful, fail-fast execution order.
  - Schema cleanup (`truncatePublicSchema`) is mandatory between tests to ensure repeatable results.
  - Schema cleanup acquires an advisory lock to prevent concurrent truncation deadlocks.
  - Generated Prisma clients are build-time artifacts and are NEVER committed to version control.

## Assessment attempt backend truth

- Learner-safe snapshot reads now have a dedicated route: `GET /workspace/assessment-attempts/:attemptId/snapshot`.
- That route authorizes with `assessment.attempt.read`, verifies tenant/workspace ownership plus learner ownership, loads the snapshot by `attempt.snapshotId`, and returns the published snapshot response only.
- Attempt runtime now includes a grading foundation with deterministic auto grading for supported question kinds and pending-manual-review placeholders for unsupported/manual kinds.
- Execution runtime now adds reserved execution request/result contracts, provider ports, a noop default provider, and a deterministic fixture provider for tests/internal harnesses only.

## Task 011H Update (2026-05-19)

- Roadmap rebase: 011F and 011G remain safe execution-prep only. No real execution provider integration exists yet, and that work is explicitly deferred.
- Assessment attempt reliability now has a concrete lifecycle policy:
  - start is retry-safe and returns the existing in-progress attempt for the same learner/assessment;
  - save answer remains a single-row upsert per `(attemptId, questionId)`;
  - submit is idempotent for already-submitted attempts and does not repeat audit/outbox/result-placeholder side effects.
- Expiry boundary policy is deterministic: `expiresAt <= now` blocks save and submit. When that boundary is encountered during a mutation, the backend may persist the attempt as `EXPIRED` before returning the validation failure.
- Concurrency protection now includes a database uniqueness guard for one active in-progress attempt per learner/assessment plus DB-backed race tests for concurrent start/save/submit flows.
- First-load assessment route tests remain frontend-only and backend-free; Learning Delivery, Content Studio, Media Library, Communication Center, proctoring, and real execution remain outside the current assessment slice.
- The backend still does not implement real code execution, notebook execution, learner execution routes, AI grading, proctoring, Learning Delivery linkage, or Content Studio linkage.

## Task 011I Update (2026-05-20)

- Backend validation continues to support `READING_PASSAGE` and `FILE_UPLOAD` without adding storage or execution behavior.
- `READING_PASSAGE` is representable as published question content, requires no learner answer, and is not auto-graded.
- `FILE_UPLOAD` remains a manual-review-oriented placeholder kind with answer-shape compatibility only (`fileIds: string[]`); no upload intent, Media Library dependency, or signed URL flow was added.
- Next planned tasks (Task 012A, 012A1, 012A2) successfully completed the Media Library backend foundation:
  - Database schema now supports Media Library entities (`MediaAsset`, `MediaUploadIntent`).
  - Implemented transactional outbox event publication for upload intent creation/completion.
  - Implemented signed read URL issuance and upload URL PUT flows.
  - Advisory-lock serialization is applied to database truncation during test runs to avoid deadlocks.
  - Restored workspace `@mentrily/domain-contracts` and exported validated Media contracts.

## Task 011G Update (2026-05-19)

- Manual grading UI now exists for creator/admin review.
- Creator/admin can view pending manual-review answers, open grading runs, and submit manual score + feedback.
- Learner result page now exists.
- Result release workflow now exists.
- Code execution grading, notebook execution grading, AI grading, and proctoring are not implemented yet.
- Production default execution provider does not execute code.
- Fixture execution provider is test/internal only and returns deterministic metadata-driven results without running source.
- Learning Delivery is not connected to Assessment grading.
- Content Studio is not connected to Assessment grading.

## Assessment Result Release Workflow

The platform API now exposes result release and result read use cases inside the assessment-delivery module. Result release mutates the existing attempt result record inside a single transaction with audit logging and outbox event persistence.

## Task 012B Update (2026-05-21)

- Media Library backend APIs now explicitly support `fileCategory` filtering on the workspace asset list endpoint to serve portal asset-picker and filtering workflows.
- The backend still does not proxy raw file bytes, accept multipart uploads, or accept base64 file payloads for Media Library.

## Communication Center

- `platform-api` now includes a dedicated Communication Center module with domain, application, infrastructure, and HTTP layers.
- Notification template and intent mutations use the existing transaction, audit, and outbox patterns.
- Real delivery workers and real provider adapters are deferred to later tasks; 012C only adds the provider port plus noop/fixture implementations.
- 012D adds a scheduler policy, due-intent selection, delivery-attempt persistence, and an internal batch-processing use case inside `platform-api`.
- No new public scheduler endpoint is required in this phase, and platform-worker remains unchanged to avoid cross-application coupling.

# Communication Center Inbox/Preferences

- The Communication Center backend exposes own-notification inbox and own-preference endpoints through the platform API.
- In-app inbox items are sourced from existing `NotificationIntent` records with sanitized metadata-derived read/archive state.
- Provider configuration and provider secrets remain outside frontend-safe contracts and are not returned by inbox/preferences APIs.
