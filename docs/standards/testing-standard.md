# Testing Standard

## Strategy

Mentrily uses a dual-testing strategy to balance speed and confidence:

1. **Unit Tests**:
   - **File Naming**: `*.spec.ts`
   - **Scope**: Isolated business logic, domain services, and orchestration.
   - **Boundary**: Mock-driven. No database or external service interaction.
   - **Note**: Unit test configs MUST exclude DB-backed integration and e2e specs. Concretely, Vitest unit configs should exclude both `**/*.integration.spec.ts` and `**/*.e2e.spec.ts` so `pnpm test` remains DB-free.
   - **Performance**: Must remain extremely fast.
   - **Command**: `pnpm test`

2. **Integration Tests**:
   - **File Naming**: `*.integration.spec.ts`
   - **Scope**: Database persistence, transaction rollbacks, repository implementations.
   - **Boundary**: Real Postgres (`mentrily_test` on port 5433).
   - **Command**: `pnpm test:integration`

## Media Library testing note

- Media Library must cover domain invariants, use-case authorization/lifecycle checks, repository persistence, and API signed URL flows.
- Fixture object storage adapters are preferred in tests; no cloud credentials are required.

3. **Frontend Component/Unit Tests**:
   - **File Naming**: `*.spec.ts` and `*.spec.tsx`
   - **Scope**: API client boundaries, route shells, presentational components, and local hooks/state behavior.
   - **Boundary**: JSDOM + mocked network only. No backend, Prisma, or Playwright dependency.
   - **Command**: package-scoped `pnpm --filter @mentrily/portal test`

4. **Cross-Stack Playwright E2E**:
   - **File Naming**: `frontend/apps/portal/e2e/**/*.spec.ts`
   - **Scope**: real browser workflow coverage across the portal frontend, the live `platform-api`, and the dedicated test Postgres database.
   - **Boundary**: no mocked backend responses. Playwright drives the real UI and the frontend calls the real backend APIs.

- **Command**: `pnpm test:e2e`, `pnpm e2e:learning`, `pnpm e2e:content`, `pnpm e2e:assessment`, or `pnpm e2e:assessment-attempt`

## Local Integration Workflow

To run integration tests locally:

```bash
# 1. Ensure test database is up
pnpm db:test:up

# 2. Setup environment (one time)
cp .env.test.example .env.test

# 3. Run the integration test suite
pnpm test:integration

# 4. (Optional) Tear down
pnpm db:test:down
```

- Integration tests MUST NOT run against the development database.
- Integration tests MUST be sequential (non-concurrent) when sharing a database schema to prevent state interference.
- Vitest 3 integration configs MUST use `pool: 'forks'` and `fileParallelism: false` where DB isolation matters, and MUST NOT use the obsolete `threads` config.
- DB-backed e2e tests (named `*.e2e.spec.ts`) are part of the integration workflow and MUST be included only in integration configs. Normal unit test runs must never execute e2e specs.
- Strict TypeScript rules apply to tests: optional properties must be omitted rather than set to `undefined`, and array access must be checked (or use `!` if length is already asserted).
- Every integration test MUST perform cleanup (e.g., `truncatePublicSchema`) before or after execution to ensure repeatability.
- `truncatePublicSchema` uses an advisory lock to serialize schema cleanup when integration suites run in parallel across processes.
- Transaction-sensitive logic MUST have real database integration test coverage.
- Normal `pnpm test` MUST NOT require a running database.
- Content Studio 009B1 keeps DB-backed repository and API integration specs under `backend/applications/platform-api/src/modules/content-studio/tests/`.
- Content Studio API integration tests MUST prove the HTTP layer directly through `app.inject(...)`; they MUST NOT call use cases as debug fallbacks when an HTTP assertion fails.
- Frontend test suites MUST remain backend-free and MUST mock `fetch` for API client verification.
- Content Studio frontend 009C tests live under `frontend/apps/portal/src/modules/content-studio/tests/` and cover contracts/API client calls, list/editor route shells, and basic block rendering/editing behavior without requiring a backend.
- Playwright E2E MUST run only against a test database. `automation/run-content-e2e.mjs` refuses to run unless `DATABASE_URL` points to a database whose name contains `test`.
- Learning Delivery and Content Studio E2E use test-only request-context header injection from the browser to exercise real backend routes before Clerk/session wiring is complete.
- Test-only request-context injection MUST be gated by `NEXT_PUBLIC_E2E_TEST_MODE=true` and MUST NOT weaken production permission or entitlement defaults.
- Normal `pnpm test` and package-scoped frontend tests MUST stay isolated from `frontend/apps/portal/e2e/**`.
- Content Studio E2E now validates archive/restore lifecycle and document editability transitions (DRAFT → ARCHIVED → DRAFT).
- Outbox publisher adapters MUST preserve the complete event envelope when forwarding to the repository: `eventId`, `eventName`, `eventVersion`, `tenantId`, `workspaceId`, `correlationId`, `idempotencyKey`, `occurredAt`, and `payload` must never be dropped by a concrete adapter.
- The integration runner (`automation/run-integration-tests.mjs`) MUST fail loudly and stop on any command failure. It MUST NOT report success if any test or migration fails.
- Frontend shared contracts live in `frontend/packages/domain-contracts` and MUST pass `pnpm --filter @mentrily/domain-contracts typecheck` before frontend feature work proceeds.

## Local Cross-Stack E2E Workflow

```bash
# 1. Start the dedicated test database
cp .env.test.example .env.test
pnpm db:test:up

# 2. Run the guarded Content Studio E2E workflow
NEXT_PUBLIC_PLATFORM_API_URL=http://localhost:3001 \
NEXT_PUBLIC_E2E_TEST_MODE=true \
node --env-file=.env.test automation/run-content-e2e.mjs

# 3. Tear down
pnpm db:test:down
```

- Required frontend E2E env:
  - `NEXT_PUBLIC_PLATFORM_API_URL=http://localhost:3001`
  - `NEXT_PUBLIC_E2E_TEST_MODE=true`
- Do not put secrets in frontend E2E env values.
- Frontend component and unit tests MUST keep mocking network calls; only Playwright E2E may call the real backend.
- Backend integration tests remain separate from browser E2E and continue using direct Nest/Fastify HTTP coverage plus the real test Postgres database.

## Assessment domain testing standard (010A)

- Assessment domain tests are unit-only: no Prisma, no HTTP, no browser.
- All tests live in `backend/applications/platform-api/src/modules/assessment-delivery/tests/`.
- Tests must prove:
  - Assessment aggregate lifecycle (create, rename, visibility change, attempt policy, time limit, result policy, archive, restore).
  - Question entity lifecycle (create, move, rename, update grading mode, attach/detach section).
  - Question kind validation rules (MCQ ≥2 options, auto-graded MCQ exactly 1 correct, etc.).
  - Version management (draft creation, content replacement, publish, supersede).
  - Published snapshots are immutable.
  - Policies validate publish preconditions and question validity.
  - No test uses `any`; all types are explicit or inferred via strict TypeScript.
- Assessment persistence tests (Prisma repositories, HTTP APIs) exist as integration tests.
- Assessment Builder now also has cross-stack Playwright E2E coverage through the real portal UI, real backend API, and dedicated test Postgres database.
- Assessment attempt runtime now has DB-free domain/use-case tests plus DB-backed repository/API integration tests.
- Learner attempt frontend now also has frontend unit/component coverage plus cross-stack Playwright E2E through the real portal UI, real backend API, and dedicated test Postgres database.
- Normal `pnpm test` must remain DB-free. Attempt repository/API integration tests require the dedicated test database and run only through the integration workflow.
- Assessment grading runtime now has DB-free domain/use-case/event tests plus DB-backed repository/API integration tests.
- Execution adapter tests remain DB-free and must not run untrusted code. Fixture-based execution tests may only return explicit deterministic metadata-driven results.
- Learner result release workflow test coverage now exists. Real code execution/notebook execution, AI grading, and proctoring test suites still do not exist.
- Assessment authoring frontend component/unit tests remain mocked-network only; DB-backed coverage runs only through integration and E2E workflows.
- Assessment Builder frontend tests should prove backend-compatible authoring payloads, including answer key shapes and grading mode defaults for manual-grading placeholder question kinds.

## Manual Browser Smoke Checklist

At the current frontend-foundation stage, run this manual smoke check before claiming the portal is ready for the next cross-stack Content Studio task:

1. Start the portal dev server with `pnpm --filter @mentrily/portal dev`.
2. Open `/dashboard`.
3. Confirm the styled workspace app shell renders.
4. Open `/content`.
5. Open `/content/documents`.
6. Create or open a content document if the backend is running.
7. Confirm the editor shell is styled and no longer looks like plain HTML.
8. Open `/learning`.
9. Confirm the learning pages are styled inside the shared shell.
10. Confirm there are no obvious runtime or hydration errors and the portal does not look like unstyled/plain HTML.

- Content Studio Playwright E2E now exists for the first authoring cross-stack slice; this manual smoke check remains useful for rapid visual verification.

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

## Assessment Result Validation

Assessment result release requires backend unit/integration coverage, frontend unit/component coverage, and Playwright coverage against the real frontend, real backend, and test Postgres database.

## Task 011H Update (2026-05-19)

- Assessment reliability now requires DB-backed concurrency coverage for repeated start, rapid save, and repeated submit flows.
- Integration truth for this slice now includes:
  - `assessment-attempt-concurrency.integration.spec.ts`
  - `assessment-attempt-reliability.integration.spec.ts`
  - API retry/reliability assertions in assessment attempt, grading, and result API integration specs
- Timer policy tests must cover `expiresAt < now` and `expiresAt === now` for save/submit rejection, plus untimed-attempt success.
- Frontend assessment first-load baseline remains unit/component-level only. Main assessment workspace routes must render without a backend and must tolerate loading, error, and empty-data states.
- `automation/run-assessment-reliability-e2e.mjs` is the guarded reliability runner for this slice. It must require `DATABASE_URL`, refuse non-test databases, run Prisma generate/migrate deploy, execute reliability-focused backend/frontend tests, and exit non-zero on failure.
- Real code execution, notebook execution, AI grading, and proctoring test harnesses still do not exist.

## Task 011I Update (2026-05-20)

- Assessment frontend tests now also need coverage for reading-passage builder/runner rendering, file-upload placeholder rendering with no upload widget, timer severity UX, save/submission retry states, offline/reconnect messaging, and unsupported-question fallbacks.
- Backend assessment tests now also need coverage that `READING_PASSAGE` stays non-auto-graded/non-required for learner answers and that `FILE_UPLOAD` stays manual-review-oriented without storage integration.

## Task 012A2 Update (2026-05-20)

- Media Library backend test coverage is now fully active:
  - Unit tests cover domain entities, invariants, and policies.
  - Integration tests verify `PrismaMediaAssetRepository` and `PrismaMediaUploadIntentRepository` persistence behaviors.
  - API integration tests under `platform-api` verify upload intent creation, completion, list assets, get asset, read URL issuance, and archive lifecycle flows.
- Frontend `@mentrily/domain-contracts` contains typecheck-validated contracts for Media Library.
- Frontend upload widgets, asset pickers, and real cloud storage adapters remain out of scope for testing.
- Real code execution and sandbox-based execution test suites still do not exist because those features remain deferred.

## Task 012B1 Update (2026-05-21)

- `@mentrily/portal` now has a minimal frontend validation baseline:
  - `pnpm --filter @mentrily/portal typecheck`
  - `pnpm --filter @mentrily/portal test`
  - `pnpm --filter @mentrily/portal build`
- Portal smoke coverage is intentionally small in this restoration task:
  - one render test proving the dashboard route shell mounts
  - one contract-boundary test proving `@mentrily/domain-contracts` imports compile inside the portal app
- Backend DB integration reruns are not required for this task because no backend code changed.

## Task 012B Update (2026-05-21)

- Media Library frontend now has unit/component coverage for:
  - API client route usage and error normalization
  - local upload/media state helpers
  - upload widget rendering and retry/cancel controls
  - asset-card preview/archive behavior
  - asset-picker filtering and selection behavior
  - page-level loading, error, empty, and populated states
- Media frontend E2E was not added in this task because the portal app was just restored and no stable Media-specific Playwright harness existed yet; unit/component coverage plus backend integration validation remain the enforced proof.

## Communication Center

- Communication Center proof requires domain tests, use-case tests, repository integration tests, and API integration tests.
- No frontend notification UI tests are expected in 012C beyond shared contract type validation.
- 012D additionally requires duplicate outbox coverage, real-Postgres concurrency coverage, scheduler policy tests, scheduler use-case tests, and delivery-attempt persistence/integration tests.
- Communication provider adapter tests must use noop, fixture, or injected mock transports only.
- No test in Task 012E may call a live email or SMS endpoint.

# Notification Inbox/Preferences Coverage

- Communication Center frontend work must cover loading, empty, error, mutation, and preference-save states in portal tests.
- Backend coverage must confirm own-record scoping, idempotent notification mutations, safe preference upserts, and absence of provider-config leakage.

## Task 014A Additions

- Dashboard and campaign changes require route-level validation plus portal coverage for loading, empty, and success states.
- Campaign preview tests must verify safe rendering without provider execution side effects.
