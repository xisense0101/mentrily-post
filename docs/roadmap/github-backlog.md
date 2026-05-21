# GitHub Backlog (Epic → Story → Acceptance Criteria)

This backlog is issue-ready and constrained by existing Mentrily docs and ADRs.

## Epic 1: Platform Foundation

### Story 1.1 — Monorepo CI quality gates

**Acceptance criteria**

- CI runs lint, typecheck, and tests across workspaces.
- Failing checks block merge.
- PR template and review checklist are enforced in workflow conventions.

### Story 1.2 — Environment and configuration contract

**Acceptance criteria**

- Environment variable contract documented and validated at startup boundaries.
- Local/staging/production config paths are separated.
- No secrets are committed to repository.

### Story 1.3 — Baseline observability setup

**Acceptance criteria**

- Structured logging includes correlation IDs.
- Basic trace pipeline path is documented and runnable locally.
- Policy denials and privilege-sensitive events are observable.

## Epic 2: Identity and Tenancy

### Story 2.1 — Permission evaluator baseline

**Acceptance criteria**

- Authorization checks are permission/policy-based.
- No raw role checks are introduced in domain logic.
- Denials are auditable and test-covered.

### Story 2.2 — Tenant/workspace context propagation

**Acceptance criteria**

- Tenant/workspace context is required for tenant-scoped API operations.
- Missing/invalid context returns typed error response.
- Tests include cross-tenant isolation negative cases.

### Story 2.3 — Membership and workspace lifecycle scaffolding

**Acceptance criteria**

- Workspace membership model aligns to lifecycle states documented in product docs.
- Membership changes are audit-traceable.
- Free personal mode is supported without forced workspace creation.

## Epic 3: Commercial Foundation

### Story 3.1 — Entitlement resolution boundary

**Acceptance criteria**

- Plan-to-entitlement logic is centralized in commercial boundary.
- Domain modules consume entitlement ports/contracts, not plan strings.
- Behavior degrades safely when entitlement context is absent.

### Story 3.2 — Seat policy scaffolding

**Acceptance criteria**

- Starter/Pro seat limits follow documented values.
- Enforcement is workspace-scoped and auditable.
- Contract-governed enterprise path is represented without hardcoding assumptions.

## Epic 4: Eventing, Worker, and Media

### Story 4.1 — Outbox/inbox baseline

**Acceptance criteria**

- Mutating workflows can emit outbox records in same transaction boundary.
- Consumer path records inbox dedupe entries.
- Idempotent reprocessing tests are included.

### Story 4.2 — Retry and dead-letter policy

**Acceptance criteria**

- Transient failures support bounded retries with backoff.
- Poison messages route to dead-letter handling path.
- Operational visibility for retries and dead letters is present.

### Story 4.3 — Media metadata and storage adapter skeleton

**Acceptance criteria**

- Media metadata is tenant-scoped.
- Object storage access is adapter-driven.
- Signed asset access constraints are compatible with edge model.

## Epic 5: Learning Vertical Slice

### Story 5.1 — Enrollment and progress baseline

**Acceptance criteria**

- A thin learning flow exists through API/application/domain boundaries.
- Permission and entitlement checks gate access.
- Progress updates are event-capable and auditable.

## Epic 6: Content Studio Vertical Slice

### Story 6.1 — Draft/publish workflow skeleton

**Acceptance criteria**

- Authoring flow follows thin controller + use case layering.
- State transitions are explicit and auditable.
- No direct cross-module writes are introduced.

## Epic 7: Assessment Vertical Slice

### Story 7.1 — Attempt lifecycle baseline

**Acceptance criteria**

- Assessment attempt lifecycle is modeled with idempotent mutation patterns.
- Permission and entitlement checks are enforced.
- Events support downstream analytics/credentialing paths.

## Epic 8: Integration Hub

### Story 8.1 — Adapter registry and provider isolation

**Acceptance criteria**

- Providers are resolved through adapter boundaries.
- No provider-specific logic leaks into domain layer.
- Contract tests validate adapter behavior.

### Story 8.2 — Inbound webhook verification pipeline

**Acceptance criteria**

- Signature verification and replay protection are mandatory.
- Processing path is idempotent and auditable.
- Invalid webhook requests fail safely.

### Story 8.3 — Outbound webhook delivery skeleton

**Acceptance criteria**

- Delivery path includes retries and dead-letter handling.
- Delivery attempts are observable.
- Tenant context is preserved in event payload metadata.

## Epic 9: Go Connector Runtime

### Story 9.1 — Connector-node operational baseline

**Acceptance criteria**

- Connector runtime remains scoped to specialized integration workloads.
- Health/bootstrap and contract boundary wiring are in place.
- `go test ./...` runs for runtime packages touched.

## Epic 10: Analytics Foundation

### Story 10.1 — Event normalization and warehouse ingestion boundary

**Acceptance criteria**

- Domain events include required envelope metadata.
- Warehouse ingestion path preserves tenant/workspace dimensions.
- Heavy dashboard queries are not served from primary Postgres.

### Story 10.2 — Dashboard read model jobs

**Acceptance criteria**

- Precomputed read model jobs exist for initial creator/enterprise analytics views.
- Job runs are observable and failure-handled.

## Epic 11: Edge and Performance

### Story 11.1 — Tenant router hardening

**Acceptance criteria**

- Unknown domains fail closed.
- Tenant routing metadata path is centralized and auditable.
- Cache policy avoids personalized/tenant-leak scenarios.

### Story 11.2 — Asset guard hardening

**Acceptance criteria**

- Signed asset validation exists at edge boundary.
- Unauthorized asset access attempts are blocked and logged.

## Epic 12: Migration and Hardening

### Story 12.1 — Expand/contract migration runbook enforcement

**Acceptance criteria**

- Migration changes include expand/contract staging and rollback plan.
- No destructive migration proceeds without documented rollback.

### Story 12.2 — Reliability and security hardening pass

**Acceptance criteria**

- Idempotency, audit, and tenancy controls are validated on core write paths.
- Security checklist and code-review checklist pass for targeted modules.
- Known architectural risks are tracked with owners and mitigation plan.
