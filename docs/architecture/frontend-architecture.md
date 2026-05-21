# Frontend Architecture

## App Router structure

- Use route groups for segmentation (public/workspace/enterprise flows).
- Route files remain thin and delegate to module entry points.
- `app/(workspace)` is a Next.js route group only. It is not part of the public URL path.
- Current workspace URLs are:
  - `/dashboard`
  - `/learning`
  - `/learning/courses`
  - `/learning/enrollments`
  - `/content`
  - `/content/documents`
  - `/content/documents/:documentId`
  - `/assessments`
  - `/assessments/:assessmentId`
- If tenant subdomains or `/workspace/:id` routing are needed later, that belongs in a future routing/auth task rather than the current shell foundation.

## Organization model

- `modules/`: feature/domain logic.
- `foundation/`: runtime/platform concerns (tenant context, feature flags, telemetry wiring).
- `interface/`: accessible primitives, shell, and patterns.
- `state/`: client/server state orchestration.
- `contracts/`: API contract mapping and adapters.
- `styles/`: global style composition and tokens.

## Learning Delivery frontend foundation

- Learning Delivery now has a dedicated frontend module under `frontend/apps/portal/src/modules/learning-delivery`.
- The module is split into `api`, `components`, `hooks`, `routes`, `state`, `tests`, and `types` boundaries.
- Backend-aligned contracts are exposed to the portal through `frontend/packages/domain-contracts`; the current learning contract file mirrors the backend `contract-catalog` seed until direct package sharing is wired.
- The `domain-contracts` package now includes Media Library contracts and must remain aligned with the backend `contract-catalog` exports.
- Route files under `app/(workspace)/learning/**` stay thin and delegate to module route components.
- Creator and learner flows currently ship as shell routes with real API boundaries, loading states, empty states, and error states.
- Backend permissions and entitlements remain authoritative; the frontend does not reimplement server-side policy decisions.
- The first cross-stack Learning Delivery E2E slice now exists under `frontend/apps/portal/e2e`.
- Playwright starts the real Next.js app and drives the real browser UI against the live `platform-api` and dedicated test Postgres database.
- Frontend component/unit tests remain mocked-network only; they do not require backend services or a database.
- Learning Delivery E2E request-context injection is isolated behind `NEXT_PUBLIC_E2E_TEST_MODE=true` and reads typed test headers from browser storage only in that mode.
- The current browser E2E context injection is a temporary test harness for pre-auth integration. It does not mean production Clerk/session integration is complete.

## Content Studio frontend foundation

- Content Studio now has a dedicated frontend module under `frontend/apps/portal/src/modules/content-studio`.
- The module is split into `api`, `components`, `hooks`, `routes`, `state`, `tests`, and `types` boundaries.
- Backend-aligned Content Studio contracts are exposed through `frontend/packages/domain-contracts` and re-exported into the portal contract boundary.
- Route files under `app/(workspace)/content/**` stay thin and delegate to module route components.
- The current frontend slice includes:
  - content document list and create flows
  - a first document editor shell
  - local draft block editing helpers
  - save, publish, archive, and restore actions through the typed API client
- The first cross-stack Content Studio E2E slice now exists under `frontend/apps/portal/e2e/content-studio.spec.ts`.
- Playwright drives the real portal UI, the frontend calls the real `platform-api`, and persistence goes to the dedicated test Postgres database only.
- Content Studio request-context injection is centralized in `foundation/e2e/e2e-request-context.ts` and is active only when `NEXT_PUBLIC_E2E_TEST_MODE=true`.
- In normal mode, the browser sends no test tenant/workspace headers and request bodies still never carry `tenantId` or `workspaceId`.
- Editable state is derived from document status: `DRAFT` means editable, `ARCHIVED` means read-only, `PUBLISHED` with `currentDraftVersion` is editable as draft.
- Backend permissions, tenant isolation, and publish/archive policy remain authoritative; the frontend does not reimplement server-side policy decisions.
- Frontend component/unit tests remain mocked-network only; they do not require backend services or a database.
- Learning Delivery now includes only a lightweight “Attach Content Studio document later” placeholder. It is not a real course-content integration.
- This slice is still intentionally foundational only; there is no drag-and-drop UI, slash-command menu, collaborative editing, AI generation, media upload flow, assessment behavior, or final Learning Delivery linkage yet.

## Assessment Builder frontend foundation

- Assessment Builder now has a dedicated frontend module under `frontend/apps/portal/src/modules/assessment-builder`.
- The module is split into `api`, `components`, `hooks`, `routes`, `state`, `tests`, and `types` boundaries.
- Backend-aligned Assessment contracts are exposed through `frontend/packages/domain-contracts` and re-exported into the portal contract boundary.
- Route files under `app/(workspace)/assessments/**` stay thin and delegate to module route components.
- The current frontend slice includes:
  - assessment document list and create flows
  - an assessment editor shell with header, settings, publish, sections, and question list sub-components
  - complex local-to-remote state management allowing multi-type question composition and grading-mode picking
  - save, publish, archive, and restore actions through the typed API client
- Assessment question authoring now uses backend-compatible answer key fields (`correctOptionIds`, `acceptedTextAnswers`, `expectedOutput`, `rubricId`, `metadata`) and keeps long-answer/code placeholders on manual grading modes until runtime support exists.
- The `useAssessment` hook synchronizes assessment data and explicitly fetches the `latestSnapshot` if available for future runtime verification.
- Backend permissions, tenant isolation, and validation policies remain authoritative; the frontend does not reimplement server-side decisions.
- Frontend component/unit tests remain mocked-network only and verify state transitions and component logic.
- This slice is still foundational for authoring, but the first cross-stack Assessment Builder E2E now exists and proves the real frontend against the real backend and test Postgres. Learner attempt frontend now also exists. Grading frontend UX still remains deferred even though the backend grading foundation now exists.

## Server/client component philosophy

- Default to Server Components.
- Use Client Components only for interaction-heavy islands.
- Keep data-fetching close to server boundaries and pass typed props down.

## Caching and performance

- Use explicit cache directives and revalidation policy per route.
- Cache tenant-safe data only; no cross-tenant leaks.

## Accessibility and quality

- Build on accessible component foundations in `ui-system`.
- Validate keyboard navigation, semantics, and contrast in CI.

## Analytics/flags/theming

- Telemetry through adapter boundaries.
- Feature flags through foundation contracts.
- White-label theming through runtime configuration + tokenized UI system.

## Learner attempt frontend foundation

- Learner attempt UI now has a dedicated frontend module under `frontend/apps/portal/src/modules/assessment-attempts`.
- Route files live under `app/(workspace)/attempts/**` and `app/(workspace)/assessments/[assessmentId]/attempt/page.tsx`, while the real browser URLs are `/attempts`, `/attempts/:attemptId`, and `/assessments/:assessmentId/attempt`.
- The learner attempt module uses a typed API client boundary, typed shared contracts, local attempt state helpers, dedicated answer input components, and route-specific hooks.
- The learner runner renders immutable published snapshot content only. It does not read creator draft content or mutate Assessment Builder drafts.
- Learner attempt Playwright E2E now exists under `frontend/apps/portal/e2e/assessment-attempt.spec.ts` and exercises the real frontend + real backend + real test Postgres stack.
- No teacher manual grading frontend or learner results frontend exists yet in this slice.
- Backend grading runtime foundation now exists, but result release workflow, code execution, notebook execution, AI grading, proctoring, Learning Delivery linkage, and Content Studio linkage still do not exist in the frontend slice.

## Task 011D Update (2026-05-18)
- Manual grading UI now exists for creator/admin review.
- Creator/admin can view pending manual-review answers, open grading runs, and submit manual score + feedback.
- Learner result page is not implemented yet.
- Result release workflow is not implemented yet.
- Code execution grading, notebook execution grading, AI grading, and proctoring are not implemented yet.
- Learning Delivery is not connected to Assessment grading.
- Content Studio is not connected to Assessment grading.
- Grading E2E uses real frontend + real backend + test Postgres.


## Assessment Results Frontend

The portal includes a dedicated `assessment-results` module for learner-safe released results and instructor release actions. Learner and instructor result routes remain separate to prevent accidental leakage of grading internals.

## Task 011H Update (2026-05-19)

- Assessment frontend reliability work remains intentionally small: no UI redesign, only first-load baseline protection for assessment builder, learner attempt, learner result, and grading routes.
- Route-level tests now prove loading, error, and empty-data safety without requiring a backend.
- Frontend request bodies still must not carry tenant/workspace IDs for assessment lifecycle mutations.
- No learner execution UI, notebook execution UI, AI grading UI, or proctoring UI exists.

## Task 011I Update (2026-05-20)

- Assessment Builder now renders dedicated editors for `READING_PASSAGE` and `FILE_UPLOAD`.
- Learner attempt UI now renders reading passages as context blocks, file-upload questions as disabled placeholders, and unsupported kinds through safe fallback messaging.
- Timer UX now shows remaining time, warning thresholds, and local expired disablement while the backend remains the final authority.
- Save/submit UX now exposes loading, retry, and offline/reconnect messaging without adding local queues, IndexedDB persistence, or service workers.
- Frontend Media Library contracts, signed URLs, real code execution, notebook execution, AI grading, proctoring, and Learning Delivery/Content Studio linkage remain out of scope for the user interface.

## Task 012A2 Update (2026-05-20)

- Restored the `@mentrily/domain-contracts` package name and workspace configuration to support shared contracts.
- Exported the complete Media Library frontend contract suite (e.g. `MediaAssetStatusContract`, `MediaUploadIntentStatusContract`, `MediaAssetVisibilityContract`, `MediaFileCategoryContract`, `MediaStorageProviderContract`, `MediaAssetContract`, `MediaUploadIntentContract`, `CreateMediaUploadIntentRequest`, `CompleteMediaUploadRequest`, `MediaReadUrlContract`).
- No frontend upload widget or asset picker interfaces are implemented yet.

## Task 012B1 Update (2026-05-21)

- The checkout now includes a minimal `frontend/apps/portal` Next.js App Router workspace with package name `@mentrily/portal`.
- The restored portal currently provides only the shell foundation needed for future frontend slices:
  - root app layout
  - `app/(workspace)/layout.tsx`
  - `app/(workspace)/dashboard/page.tsx`
  - a minimal workspace landing page
  - `foundation/api-client.ts`
  - testing/render helpers and smoke coverage
- The portal can import `@mentrily/domain-contracts` directly and compile against Media Library contracts.
- Media Library upload/list/preview/archive UI is still not implemented in this task; Task 012B resumes from this restored app boundary.

## Task 012B Update (2026-05-21)

- The portal now contains a dedicated `media-library` frontend module under `frontend/apps/portal/src/modules/media-library`.
- The module is split into `api`, `components`, `hooks`, `routes`, `state`, `tests`, and `types` boundaries.
- The upload workflow creates intents through platform-api, uploads bytes directly to signed URLs with `XMLHttpRequest`, then completes the asset through platform-api.
- Signed read URLs are requested on demand for preview/open actions and are not persisted in browser storage.
- The reusable asset picker exists as a foundation only; it is not wired into Assessment, Content Studio, or Learning Delivery yet.
