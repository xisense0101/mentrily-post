# Domain Dependency Map

This map is derived from existing docs only (`docs/product`, `docs/architecture`, `docs/standards`, `docs/decisions`, `docs/roadmap`, `docs/ai`, root `README.md`, and `.github/copilot-instructions.md`).

## 1) Complete dependency map (backend domains + platform runtime)

## Foundation domains (must be implemented first)

### `identity-access`

- **Provides**: principal identity, permission evaluation entry points, role-presets-as-permission-bundles, super-admin separation hooks.
- **Depends on**: provider auth adapters (Clerk now, WorkOS boundary later), audit capability.
- **Why foundational**: all tenant-scoped and privileged actions require permission checks.

### `workspace-governance`

- **Provides**: workspace lifecycle, membership context, tenant/workspace binding.
- **Depends on**: identity principal, audit capability, commercial entitlement signals for workspace-backed plans.
- **Why foundational**: tenant isolation requires explicit workspace context on reads/writes.

### `media-library`

- **Provides**: media metadata, upload intents, signed URL issuance contracts, object-key ownership boundaries.
- **Depends on**: workspace context, permission evaluation, audit/outbox durability, object storage adapter port.
- **Why now**: later frontend uploads, assessment file uploads, and communication attachments need a safe backend storage foundation first.
- **012A/012A1 state**: backend Media Library and storage port are in place; migration scope is Media-only and integration cleanup is advisory-lock serialized.
- **012A2 state**: frontend `@mentrily/domain-contracts` package is restored with Media Library contracts and typecheck coverage.

### `commercial-operations`

- **Provides**: plan-to-entitlement resolution, seat model enforcement, usage policy boundary.
- **Depends on**: identity/workspace context, billing adapter boundary.
- **Why foundational**: plan logic must be centralized and consumed through entitlement ports.

### `platform-operations`

- **Provides**: operational controls, feature flag policy hooks, privileged platform actions.
- **Depends on**: identity + permission model, observability and audit.
- **Why foundational**: secure operation of platform-level administration.

## Cross-cutting support domains

### `integration-hub`

- **Provides**: inbound/outbound integration orchestration, webhook lifecycle.
- **Depends on**: identity/workspace context, outbox/inbox/event model, worker retries/dead letters.
- **Couples to runtimes**: `platform-worker`, `go-runtime` connector-node.

### `communication-center`

- **Provides**: provider-agnostic notification orchestration.
- **Depends on**: integration adapter boundaries, worker async delivery, auditability.

### `media-library`

- **Provides**: media metadata and signed access coordination.
- **Depends on**: storage toolkit/object storage adapters, Cloudflare asset protection model, tenant context.

### `credentialing`

- **Provides**: certificate/credential issuance lifecycle.
- **Depends on**: learning/assessment outcomes, audit/event model.

### `intelligence`

- **Provides**: analytics, reporting, dashboards, and data-driven insights.
- **Depends on**: permission/entitlement context, observability, transactional read-models (Postgres/Redis), future analytical database (ClickHouse).
- **Note**: AI-assisted product features live in their respective domains (e.g., AI authoring in `content-studio`).

## Product vertical domains

### `content-studio`

- **009D current state**: reusable block-document model with Prisma persistence, backend APIs, permission checks, audit/outbox transactions, direct HTTP integration coverage, a first frontend authoring shell for document list/create and basic editor actions, and a first cross-stack Playwright E2E slice through the real frontend, real backend, and real test Postgres database.
- **009C1 routing note**: portal route files live under `app/(workspace)/content/**`, but the real browser URLs are `/content`, `/content/documents`, and `/content/documents/:documentId` because `(workspace)` is a Next.js route group rather than a path segment.
- **Depends on**: tenant/workspace context, permission evaluation, transaction runner, audit/outbox ports, and Prisma-backed repository adapters.
- **Does not depend on in 009D**: `learning-delivery` linkage, collaborative editing infrastructure, media upload infrastructure, AI generation, or external event publication.
- **Enables**: authored assets for learning now and future assessment/question builders through the same block-document foundation.

### `learning-delivery`

- **Depends on**: identity/workspace context, commercial entitlements, event model.
- **009C1 routing note**: portal route files live under `app/(workspace)/learning/**`, but the real browser URLs are `/learning`, `/learning/courses`, and `/learning/enrollments`.
- **Later dependency direction**: may reference published Content Studio documents/snapshots in a future task, but 009D only documents that direction and adds a placeholder note; there is still no persistence or business-logic linkage.
- **Feeds**: credentialing and analytics.
- **Current implementation truth**: backend persistence/API slice is complete; portal frontend foundation exists for creator course management shells and learner enrollment shells; the first cross-stack Playwright E2E slice now validates the real frontend + real backend + real test Postgres workflow.

### `assessment-delivery`

- **010D1 baseline**: Assessment Builder authoring domain, persistence/API, frontend authoring shell, and cross-stack Assessment Builder E2E already exist.
- **011A current state**: learner assessment attempt runtime backend foundation now exists as a separate runtime slice. It uses published assessment snapshots only, persists learner attempt/session/answer/result-placeholder records, exposes backend attempt APIs, enforces lifecycle and ownership rules, and emits audit/outbox-backed attempt events.
- **011B current state**: learner attempt frontend and cross-stack E2E now exist. Learners can start/resume attempts, read learner-safe published snapshots, save answers, submit attempts, review submitted status/result placeholders, and list learner-owned attempts through the real portal frontend.
- **Current backend/runtime scope**:
  - Authoring remains separate from attempts. Attempt runtime does not mutate draft assessments, published snapshots, Content Studio documents, or Learning Delivery records.
  - Learner attempts are modeled with `AssessmentAttempt`, `AssessmentAttemptAnswer`, `AssessmentAttemptSession`, and `AssessmentAttemptResult`.
  - Backend routes exist for start, list, get, save answer, submit, and cancel attempt operations.
  - Prisma schema and migration now include `AssessmentAttempt`, `AssessmentAttemptAnswer`, `AssessmentAttemptSession`, and `AssessmentAttemptResult`.
  - Contracts and permissions exist for attempt runtime.
- **011C current state**: grading runtime foundation now exists on the backend. Submitted attempts can be graded through deterministic grading use cases, grading runs and answer grades are persisted, auto-gradable questions can be scored deterministically, and unsupported/manual kinds become pending manual review records.
- **011G current state**: execution runtime now has a safe adapter boundary with a noop default provider, a deterministic fixture provider for tests/internal harnesses, internal request/get/cancel use cases, and no persistence changes. No real sandbox or external provider exists yet.
- **011H current state**: assessment attempt lifecycle now has a documented reliability baseline. Start returns the existing in-progress attempt on safe retry, answer saves remain single-row upserts per attempt/question, submit is idempotent for already-submitted attempts, timer-boundary expiry is covered, and DB-backed concurrency tests now exist for repeated start/save/submit.
- **Roadmap rebase note**: 011F and 011G were safe execution-prep tasks only. Real execution provider integration is paused. The roadmap now resumes with Assessment Reliability and Concurrency Baseline as Task 011H, then Assessment UX hardening/question expansion as 011I, with Media Library later.
- **Still deferred after 011H**: real code execution, notebook execution, AI grading, proctoring, Learning Delivery linkage, and Content Studio persistence linkage.
- **Depends on**: identity/workspace context, commercial entitlements, transaction runner, audit/outbox ports, and Prisma-backed repository adapters.
- **Does not depend on**: `content-studio` (direct imports forbidden for independence), `learning-delivery` (direct imports forbidden), or the frontend builder UI (now available in 010C/010C1 with backend-compatible authoring payloads).
- **Future usage**: credentialing will consume published assessment attempt results; analytics will consume assessment events; integration module will support assessment webhooks.
- **Feeds**: credentialing, analytics, integration notifications (in future).
- **Boundary enforcement in 011A**: no direct ContentDocument/LearningCourse imports, no content-studio/learning-delivery module imports, no empty tenant/workspace event fabrication, all persistence operations wrapped in transactional contexts, and no grading execution/code execution/proctoring implementation.

## Runtime/infrastructure dependency spine

1. **Cloudflare edge + tenant routing** gates incoming traffic and tenant context.
2. **platform-api modular monolith** executes domain use cases.
3. **Postgres + Prisma** are transactional source of truth.
4. **Redis** supports cache/locks/queue coordination.
5. **Outbox/inbox + platform-worker** support eventual consistency and retries.
6. **Go runtime** is used only for specialized connector/realtime/execution workloads.
7. **Object storage** holds media/artifacts; edge signed access protects sensitive assets.
8. **ClickHouse later** receives analytics events/read models to avoid OLTP pressure.

## Dependency constraints (hard rules)

- No role-based backend modules.
- No direct cross-module writes.
- No tenant-scoped operations without workspace/tenant context.
- No hardcoded plan logic in domain services.
- Provider integrations remain behind ports/adapters.
- All writes must account for idempotency and audit implications.

## 2) Recommended implementation order (first 12 sprints)

This sequence aligns to existing `enterprise-transition-roadmap.md` and dependency prerequisites.

### Sprint 1 — Platform foundation

- CI quality gates, baseline observability/log correlation, environment contracts.
- Harden `platform-api`, `platform-worker`, edge scaffolding.

### Sprint 2 — Identity + tenancy

- `identity-access` and `workspace-governance` foundations.
- Permission evaluator baseline and tenant context propagation.
- Privileged audit hooks.

### Sprint 3 — Plans + entitlements

- `commercial-operations` entitlement boundary and seat policy.
- Plan resolution exposed as typed contracts (no scattered plan checks).

### Sprint 4 — Worker + events + media

- Outbox/inbox baseline, idempotent consumer policy, retry/dead-letter scaffolding.
- `media-library` storage adapter baseline with tenant-safe metadata model.

### Sprint 5 — Learning vertical slice

- First thin `learning-delivery` slice with permissions and entitlement checks.

### Sprint 6 — Content studio

- `content-studio` authoring baseline (reusable block-document domain, then persistence/API, then editor UX).

### Sprint 7 — Assessment vertical slice

- `assessment-delivery` attempt and scoring pipeline baseline.

### Sprint 8 — Integration hub

- `integration-hub` adapter framework and webhook lifecycle with signing/replay controls.

### Sprint 9 — Go connector runtime

- `go-runtime` connector-node operational baseline integrated with integration contracts.

### Sprint 10 — Analytics

- Event normalization and warehouse/read-model path for dashboard-grade analytics.

### Sprint 11 — Cloudflare + performance

- Tenant-router hardening, edge caching policy, signed asset controls, latency tuning.

### Sprint 12 — Migration + hardening

- Expand/contract cleanups, reliability drills, release hardening, enterprise readiness.

## Task 011D Update (2026-05-18)

- Manual grading UI now exists for creator/admin review.
- Creator/admin can view pending manual-review answers, open grading runs, and submit manual score + feedback.
- Learner result page is not implemented yet.
- Result release workflow is not implemented yet.
- Code execution grading, notebook execution grading, AI grading, and proctoring are not implemented yet.
- Learning Delivery is not connected to Assessment grading.
- Content Studio is not connected to Assessment grading.
- Grading E2E uses real frontend + real backend + test Postgres.

## Assessment Result Release Dependency Note

Assessment result release depends on assessment attempts, published snapshots, and grading runs. It is still intentionally disconnected from Learning Delivery, Content Studio, certificates, analytics, code execution, notebook execution, AI grading, and proctoring.

## Task 011I Update (2026-05-20)

- Assessment UX hardening and question-type expansion now exist.
- Builder and learner runner now support `READING_PASSAGE`.
- Builder and learner runner now expose `FILE_UPLOAD` only as a placeholder boundary before Media Library.
- Learner timer/save/offline UX is hardened and unsupported kinds now fail safely.
- Media Library, storage adapters, signed URLs, real code execution, notebook execution, AI grading, proctoring, and Learning Delivery/Content Studio linkage remain deferred.
- Next planned task is Task 012A — Media Library Domain and Storage Adapter.

## Task 012B1 Update (2026-05-21)

- `media-library` frontend work depends on a real portal application workspace under `frontend/apps/portal`.
- That app boundary is now restored as a minimal Next.js workspace shell instead of remaining implicit.
- The restored portal currently depends on shared frontend contracts via `@mentrily/domain-contracts` and is ready to host future workspace routes such as Media Library.
- Media Library frontend workflows, asset picker UI, and assessment/content integrations remain deferred to Task 012B and later.

## Task 012B Update (2026-05-21)

- `media-library` now spans both backend control-plane APIs and a real portal frontend module.
- Current frontend dependencies are:
  - shared Media contracts from `@mentrily/domain-contracts`
  - workspace shell routing in `@mentrily/portal`
  - Media Library backend APIs for intent/read/archive control flows
  - signed object-storage URLs for actual file transfer
- Assessment file-upload, Content Studio, and Learning Delivery still depend on future integration tasks rather than the 012B foundation alone.

## Communication Center

- Communication Center currently depends on service-core request/transaction/audit/outbox abstractions, security-toolkit permissions, contract-catalog exports, and data-platform Prisma persistence.
- Assessment, Learning Delivery, Media Library, and Content Studio remain upstream future producers of communication intents rather than current dependencies.
- The internal scheduler foundation depends on the same boundaries plus delivery-attempt persistence, but it still avoids real provider adapters and worker loops in this phase.
- Communication Center now depends on backend-only provider configuration and adapter selection boundaries, but still has no outbound live provider integration.

## Task 014A Additions

- Dashboard depends on workspace governance, learning delivery, assessment delivery, content studio, media library, audit data, and campaign persistence.
- Campaign management depends on workspace governance, communication center template safety, and existing workspace member/course/assessment/content/media relations.
