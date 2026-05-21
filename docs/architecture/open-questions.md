# Open Questions Before Feature Implementation

This document captures unresolved architecture risks after scaffolding, and docs that should be improved before major feature implementation starts.

## 5) Unresolved architecture risks

## A. Tenancy and identity enforcement risk
- **Risk**: Tenant/workspace context requirements are documented but not yet implemented as enforceable runtime middleware/guards across API and async consumers.
- **Status**: **Partially Solved (Task 003)**. `RequestContext` and `WorkspaceContext` ports exist.
- **Remaining**: Implementation of enforceable middleware/interceptors in `platform-api`.
- **Needed decision/next step**: Define canonical context propagation enforcement points.

## B. Permission policy execution risk
- **Risk**: Permission-based model is documented, but policy engine boundaries and evaluation semantics are not yet specified in implementation detail.
- **Status**: **Scaffolded (Task 004)**. `PermissionEvaluator` port exists and fails-closed by default.
- **Remaining**: Implementation of the real policy engine (e.g., OPA, Casbin, or custom).
- **Needed decision/next step**: Select policy engine and define denial/audit behavior.

## C. Entitlement centralization risk
- **Risk**: Plan-to-entitlement boundary is required, but contract shape and fallback behavior are not yet detailed.
- **Status**: **Scaffolded (Task 004)**. `EntitlementEvaluator` port exists and fails-closed. Plan limits are defined.
- **Remaining**: Formalize entitlement engine logic and persistence.
- **Needed decision/next step**: Define entitlement resolution strategy per module.

## D. Event consistency and idempotency risk
- **Risk**: Outbox/inbox strategy exists at document level, but canonical idempotency key strategy, dedupe horizon, and replay handling details are unresolved.
- **Status**: **Scaffolded (Task 003)**. `OutboxPublisher` port exists.
- **Remaining**: Canonical idempotency key strategy and dedupe implementation.
- **Needed decision/next step**: Publish eventing implementation checklist.

## E. Integration trust-boundary risk
- **Risk**: Webhook verification/replay protections are mandated, but shared implementation pattern and key-rotation strategy are unspecified.
- **Status**: **Open**.
- **Needed decision/next step**: Define standard webhook verification module contract.

## F. Analytics path risk
- **Risk**: ClickHouse-later strategy is documented, but event taxonomy for analytics-readiness is still broad.
- **Status**: **Open**.
- **Needed decision/next step**: Define minimum analytics event catalog.

## G. Edge routing and custom domain risk
- **Risk**: Cloudflare responsibilities are clear, but authoritative domain verification lifecycle and invalidation flows are not yet specified.
- **Status**: **Open**.
- **Needed decision/next step**: Define domain onboarding lifecycle states.

## H. Intelligence module scope
- **Risk**: The `intelligence` module name is ambiguous. It could be for AI orchestration, analytics/insights, or both.
- **Status**: **Solved (Task 004A)**.
- **Decision**: `intelligence` means analytics, reporting, dashboards, and insights. AI-assisted product features are owned by the specific domain modules that use them (e.g., `content-studio` for AI authoring).

## J. Execution runtime isolation risk
- **Risk**: Execution providers must be isolated from platform-api and cannot receive database credentials, but the orchestration boundary and provider selection are not yet decided.
- **Status**: **Open** (Task 011G safe adapter/harness complete).
- **Needed decision/next step**: Define the real isolated provider, feature-flag strategy, durable request/result persistence needs, and isolation policy split for code vs notebook execution.

## I. Entitlement subject model gap
- **Risk**: The current `WorkspaceEntitlementEvaluator` is strictly workspace-scoped. However, product rules state that Free accounts are personal and do not automatically create workspaces. This means Free accounts taking courses (Learner experience) have no workspace context, and thus the current evaluator will deny them access.
- **Status**: **Resolved (Task 006F)**.
- **Decision**: Mentrily will use a dual-subject entitlement model:
  1. Workspace-scoped entitlements for Starter/Pro/Enterprise plans.
  2. Principal-scoped entitlements for Free personal accounts.
- **Implemented Outcome**:
  1. `EntitlementEvaluationInput` now requires an explicit entitlement subject (`workspace` or `principal`).
  2. Commercial entitlement evaluation is subject-aware and supports principal-scoped Free evaluation without workspace creation.
  3. Workspace-backed plans continue to evaluate by workspace subject.

## 6) Docs to improve before feature implementation starts

## Solved/Updated
1. `docs/product/plan-entitlements.md`: Updated with concrete limits and examples (Task 004).
2. `docs/ai/codex-task-template.md`: Updated with continuity context (Task 004).
3. Backend Module Shape: Completed 5-layer structure for all modules (Task 004).

## Remaining
1. `docs/architecture/backend-architecture.md`: Add concrete command/query examples.
2. `docs/architecture/data-architecture.md`: Add explicit tenant-key conventions.
3. `docs/architecture/event-model.md`: Add required vs optional envelope fields.
4. `docs/architecture/integration-architecture.md`: Add inbound webhook verification checklist.
5. `docs/architecture/cloudflare-edge-model.md`: Add tenant domain verification lifecycle.

## Decision checkpoint
Before starting product feature implementation, run an architecture review checkpoint confirming:
- [x] permission evaluator contract agreed (Task 003/004),
- [x] tenant context contract agreed (Task 003),
- [x] entitlement boundary contract agreed (Task 003/004),
- [ ] event envelope/idempotency defaults agreed,
- [ ] webhook trust-boundary pattern agreed.
