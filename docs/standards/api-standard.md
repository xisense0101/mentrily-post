# API Standard

- Validate all inbound DTOs.
- Require tenant/workspace context for tenant-scoped operations.
- Use idempotency keys for mutation endpoints where retry can occur.
- Return typed error envelopes with machine-readable codes.
- Keep route handlers thin; application layer executes use cases.

## Concrete foundation conventions

- API ingress must attach/propagate `x-request-id` and `x-correlation-id`.
- Error envelopes must include `error.code` and `error.message`, and include `requestId` when available.
- Tenant-scoped endpoints must rely on request context extraction rather than ad-hoc header parsing in domain handlers.

## Frontend API client boundary

- Frontend feature modules must call backend routes through a typed API client boundary instead of ad-hoc `fetch` calls scattered through components.
- Learning Delivery now follows this pattern through `frontend/apps/portal/src/modules/learning-delivery/api/learning-api-client.ts`.
- Content Studio frontend now follows the same rule through `frontend/apps/portal/src/modules/content-studio/api/content-api-client.ts`.
- Content Studio request context remains backend-owned: tenant/workspace/actor context comes from request context, never from the request body.

## Media API rules

- Media routes must not accept raw multipart file bytes or base64 payloads in `platform-api`.
- Tenant/workspace ownership must come from request context, never from request bodies.
- Private asset access must use signed read URL checks.
- Content Studio concrete authoring routes:
  - `POST /workspace/content/documents`
  - `GET /workspace/content/documents`
  - `GET /workspace/content/documents/:documentId`
  - `PATCH /workspace/content/documents/:documentId`
  - `PUT /workspace/content/documents/:documentId/blocks`
  - `POST /workspace/content/documents/:documentId/publish`
  - `POST /workspace/content/documents/:documentId/archive`
  - `POST /workspace/content/documents/:documentId/restore`
  - `GET /workspace/content/documents/:documentId/snapshots/latest`
- Frontend request bodies must never send `tenantId` or `workspaceId` for tenant-scoped routes; tenant/workspace context remains request-context driven on the backend.
- Content Studio API validation must cover the real HTTP layer directly for create, list, read, update, replace-blocks, publish, archive, restore, and latest-snapshot routes.
- Content Studio frontend components must call the typed API client or injected hook boundary rather than embedding raw route URLs inside interactive components.
- Test-only E2E request-context injection may send tenant/workspace headers, but only when an explicit E2E harness mode is enabled. Production request behavior must not depend on browser-stored tenant/workspace IDs.
- Content Studio cross-stack E2E uses that test-only request-context path to exercise the real browser, real frontend API client, real backend HTTP controllers, and real test Postgres database without putting `tenantId` or `workspaceId` in request bodies.
- Frontend contract types must stay aligned with backend API contracts. Temporary mirrored contract files are acceptable only when package sharing is not yet wired and must match the backend contract seed exactly.
- Assessment Builder authoring payloads must send backend-compatible question answer keys; single-select and multi-select answers use `correctOptionIds`, short answers use `acceptedTextAnswers`, code placeholders use `expectedOutput`, and manual-grading placeholders may use `rubricId` or `metadata` only when needed.
- Assessment attempt runtime routes must derive tenant, workspace, and learner actor identity from request context, not from request bodies. Attempt bodies may carry answer payloads and metadata only. Attempt runtime must operate on published snapshot references, not draft authoring records.
- Learner attempt frontend routes must use a typed attempt API client boundary for:
  - `POST /workspace/assessments/:assessmentId/attempts`
  - `GET /workspace/assessment-attempts`
  - `GET /workspace/assessment-attempts/:attemptId`
  - `GET /workspace/assessment-attempts/:attemptId/snapshot`
  - `PUT /workspace/assessment-attempts/:attemptId/answers/:questionId`
  - `POST /workspace/assessment-attempts/:attemptId/submit`
  - `POST /workspace/assessment-attempts/:attemptId/cancel`
- Learner-safe snapshot reads must return published snapshot DTOs only and must not expose builder draft content.
- UI components should receive typed data and callbacks; they must not embed permission or entitlement rules that belong to the backend source of truth.
- Assessment grading routes must derive tenant/workspace/actor context from request context, never trust tenant/workspace from bodies, enforce workspace ownership on attempts/runs, and keep learner access blocked until the later result-release task explicitly opens a learner-safe surface.
- Mutating grading routes must keep grading-run persistence, attempt-result persistence, audit, and outbox publication inside the same transaction.
- Assessment execution remains backend-internal in 011G. No learner-facing execution route exists. Any future instructor/admin execution surface must stay permission-gated, sanitize outputs, and size-limit stdout/stderr/error fields.

## Task 011D Update (2026-05-18)

- Manual grading UI now exists for creator/admin review.
- Creator/admin can view pending manual-review answers, open grading runs, and submit manual score + feedback.
- Learner result page is not implemented yet.
- Result release workflow is not implemented yet.
- Code execution grading, notebook execution grading, AI grading, and proctoring are not implemented yet.
- Learning Delivery is not connected to Assessment grading.
- Content Studio is not connected to Assessment grading.
- Grading E2E uses real frontend + real backend + test Postgres.

## Assessment Result API Safety

Learner result endpoints must never expose unreleased scores, correct answer keys, or internal grading metadata. Workspace context comes from request context headers/session state, not from request bodies.

## Task 011H Update (2026-05-19)

- Assessment reliability/concurrency baseline now defines retry behavior for the learner attempt lifecycle.
- `POST /workspace/assessments/:assessmentId/attempts` is safe for double-click/retry: when the same learner already has an in-progress attempt for that assessment, the backend returns the existing attempt instead of creating a duplicate.
- `PUT /workspace/assessment-attempts/:attemptId/answers/:questionId` remains an upsert by `(attemptId, questionId)`; repeated or rapid saves must not create duplicate answer rows, and tenant/workspace IDs still must not appear in request bodies.
- `POST /workspace/assessment-attempts/:attemptId/submit` is idempotent for already-submitted attempts. Repeated submit returns the current submitted attempt state and must not duplicate result placeholders, grading placeholders, audit records, or outbox events.
- Timer boundary policy is `now >= expiresAt`: attempts at or past expiry cannot save or submit. The backend may persist the attempt as `EXPIRED` when that boundary is detected during a lifecycle mutation.
- Result release retry behavior remains a clean conflict rather than a second release. Repeated release attempts must not duplicate release audit/outbox records.
- 011F and 011G did not add real code execution. No learner execution endpoint, notebook execution, AI grading, or proctoring API exists.

## Task 011I Update (2026-05-20)

- Assessment Builder and learner attempt payloads now explicitly tolerate `READING_PASSAGE` and `FILE_UPLOAD`.
- `READING_PASSAGE` is display/context only and should not trigger answer-save behavior.
- `FILE_UPLOAD` remains metadata-only in this phase; assessment APIs still do not accept binary payloads, `FormData`, signed URL requests, or storage adapter calls.
- Unsupported question kinds must fail safely in frontend clients rather than crashing the route.

## Task 012B Update (2026-05-21)

- Media Library frontend requests must not include tenantId or workspaceId in request bodies.
- Media upload bytes must not pass through platform-api; only control-plane metadata and lifecycle calls use the API.
- Signed URL responses may contain URLs, methods, headers, and expirations and must be treated as sensitive.

## Communication Center

- Communication Center request bodies must not include tenantId or workspaceId.
- Template rendering supports only declared `{{variableName}}` placeholders and must not use `eval`, `new Function`, or arbitrary code execution.
- Communication APIs must not claim real delivery behavior while providers remain noop/fixture-only.
- Scheduler processing is reserved/internal in 012D; any future trigger must derive scope from trusted context, not from request body tenant/workspace fields.
- Communication provider configuration is backend-only and must not be exposed through public configuration or send endpoints.
- API contracts may expose safe provider mode/status values, but must not expose provider credentials or raw transport payloads.
