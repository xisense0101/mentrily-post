# Product Model

## What Mentrily is

Mentrily is a multi-tenant AI LMS and assessment SaaS for creators, academies, training businesses, and enterprise learning teams. It supports course authoring, assessments, credentialing, analytics, integrations, and enterprise controls.

## Personas

- **Individual Creator**: builds and sells learning content and exams.
- **Training Team Admin**: manages workspace governance, users, and entitlements.
- **Instructor/Creator**: authors courses, assessments, and learning paths.
- **Learner**: consumes courses, takes assessments, receives credentials.
- **Enterprise Admin**: enforces policies, SSO/SCIM, branding, and audit compliance.
- **Partner/Reseller Operator**: manages multi-account customer portfolios.

## Learner vs creator model

A person can act as learner and creator at different times. These are product experiences, not exclusive identities. Access is determined by workspace membership + permission sets.

## Workspace model

## Media Library foundation

- Media Library backend foundation now tracks tenant/workspace-scoped media metadata and upload intents.
- Assets default to private visibility in this phase.
- Platform API still does not accept raw multipart/base64 file bytes; uploads are represented through signed intent contracts only.

- Personal free usage may exist without a workspace.
- Team plans are workspace-backed and include seats, governance, and permissions.
- Enterprise adds custom domains, white-label controls, advanced administration, and SSO/SCIM through adapters.
- The current portal uses a Next.js route group for workspace surfaces. The `(workspace)` folder shapes code organization only and does not appear in browser URLs.
- Current workspace-facing portal routes are `/dashboard`, `/learning`, `/learning/courses`, `/learning/enrollments`, `/content`, `/content/documents`, `/content/documents/:documentId`, `/assessments`, and `/assessments/:assessmentId`.

## Free vs team vs enterprise behavior

- **Free**: Personal-first, no automatic workspace, limited to 2 courses and 2 exams/month. Basic question types only.
- **Starter**: Workspace-backed, up to 15 courses and 10 exams/month, 5 seats total (2 admin, 3 creator).
- **Pro**: Workspace-backed, up to 30 courses and 20 exams/month, 15 seats total (5 admin, 10 creator).
- **Enterprise**: Contract-governed, custom domains, white-labeling, SSO/SCIM, and expanded governance.

## Task 014D Update

- Assessment attempt runtime is now retry-safe and concurrency-safe for learner start, answer save, and submit flows.
- Server-side expiry is authoritative; frontend timers are advisory only.
- Terminal attempts are immutable and do not expose unreleased score, private grading, or storage metadata.

## Core product capabilities

- Creator dashboard and operational cockpit
- Course and assessment authoring/delivery
- Analytics and progress intelligence
- Credentialing/certificates
- Integrations, webhooks, API keys
- Audit trails, entitlement controls, and global performance support

## Content Studio foundation

- Content Studio is the reusable block-document authoring foundation for Mentrily.
- Core domain concepts:
  - `ContentDocument`: tenant/workspace-owned authoring aggregate for course content, lesson content, general pages, and reserved future assessment/question content.
  - `ContentBlock`: reusable block node with kind, path, parent reference, content payload, and metadata payload.
  - `ContentVersion`: mutable draft version and publishable version-state boundary for ordered block sets.
  - `ContentPublishedSnapshot`: immutable published copy intended for downstream learner-facing consumption later.
- Course builder and future exam builder reuse the same block-document model instead of separate editor foundations.
- Content Studio now has Prisma persistence and backend APIs for draft creation, listing, reading, renaming, replacing draft blocks, publishing snapshots, archiving, restoring to draft, and fetching the latest snapshot.
- Content Studio backend validation in 009B1 proves those routes through direct HTTP integration tests against the real backend and test Postgres database.
- Content Studio now also has the first frontend authoring foundation:
  - typed frontend Content Studio contracts
  - a dedicated Content Studio API client boundary
  - document list and create flows
  - a first editor shell with basic block add/edit/remove/save actions
  - publish, archive, restore, and rename actions from the portal
  - a shared workspace shell so the browser UI reflects the intended product surface instead of plain HTML
- The first cross-stack Content Studio E2E slice now proves creator create/open/edit/save/publish and archive/restore lifecycles through the real portal, real backend API, and real test Postgres database.
- Document status lifecycle:
  - **DRAFT**: editable, can save blocks, can publish, can archive.
  - **PUBLISHED**: editable as draft if `currentDraftVersion` exists, can save draft blocks, can archive, can publish again if domain allows.
  - **ARCHIVED**: not editable, cannot save blocks, cannot publish, can only restore.
  - **RESTORED**: transitions to DRAFT, becomes editable, can save blocks, can publish again.
- Notion-like editing capabilities are still a product direction; there is no drag-and-drop UI, slash-command UI, collaborative editing, AI generation, rich WYSIWYG editor, media upload integration, or assessment-builder behavior yet.
- Learning Delivery is not yet linked directly to Content Studio documents; only a future-link placeholder is documented in the creator course detail UI.

## Assessment Builder domain model

**010A–010B2 state**: Assessment domain is complete with Prisma persistence, Postgres migrations, API controllers, and full integration test coverage. Backend APIs support create, read, publish, archive, restore, and snapshot operations.
**010C–010C2 state**: Assessment Builder now has a complete creator-side frontend authoring shell, typed API client boundary, backend-compatible assessment question payloads for draft/published authoring, and local state management for multi-type question composition.

- Test IDs and components are in place; draft/publish/archive/restore lifecycle actions work through the typed API client.
- Assessment Builder authoring exists.
- Assessment attempt backend exists.
- Learner attempt frontend/E2E exists.
- Grading runtime foundation did not exist before 011C and now exists as backend-only grading infrastructure.
- The first cross-stack Assessment Builder E2E proof now exists and is validated against the real portal UI, real backend API, and real test Postgres database.
- Core Assessment domain concepts:
- `Assessment`: tenant/workspace-owned aggregate for exams, quizzes, and practice assignments. Status lifecycle: DRAFT → PUBLISHED (via snapshot) → ARCHIVED.
- `AssessmentVersion`: represents a draft or published snapshot of assessment content. Versions are immutable once published.
- `AssessmentSection`: groups related questions within an assessment with title and metadata.
- `AssessmentQuestion`: represents a single question. Kinds include MCQ, multi-select, true/false, short answer, long answer, code, file upload, notebook, reading passage, and rubric-only.
- `AssessmentPublishedSnapshot`: immutable published copy of a version, intended for learner-facing attempt runtime later.
- `QuestionKind` enum: MCQ, MULTI_SELECT, TRUE_FALSE, SHORT_ANSWER, LONG_ANSWER, CODE, NOTEBOOK, FILE_UPLOAD, READING_PASSAGE, RUBRIC_ONLY.
- `GradingRubric` and `GradingRule`: define grading behavior for manual/hybrid/auto-graded questions.
- `AttemptPolicy`: controls retry, shuffle behavior.
- `TimeLimit`: specifies duration in minutes.
- `ResultReleasePolicy`: controls when learners see results (immediate, manual, after deadline, etc.).
- `QuestionAnswerKey`: defines correct answers for auto-graded questions or accepted answers for short answer.

- **010D state**: Cross-stack Assessment Builder E2E is implemented and proves create/edit/save/publish, archive/restore, missing-context failure, and cross-workspace protection through the real portal UI, real backend API, and real test Postgres.

** Assessment Builder does NOT yet have:**

- Production execution provider or sandbox
- Proctoring integration
- AI generation
- Drag-and-drop question ordering
- Slash-command authoring
- Connection to Learning Delivery (learners taking assessments in courses)
- Content Studio integration (yet)

## Assessment Attempt Runtime (011A foundation)

- **Current 011A scope**: `AssessmentAttempt`, `AssessmentAttemptAnswer`, `AssessmentAttemptSession`, and `AssessmentAttemptResult` now exist as backend runtime models with Prisma persistence, backend APIs, permissions, audit/outbox events, and unit/integration test coverage.
- **011B scope now implemented**: learner attempt frontend routes now exist at `/assessments/:assessmentId/attempt`, `/attempts`, and `/attempts/:attemptId`. Learners can start or resume an attempt, read published snapshot questions, save draft answers, submit attempts, and see a submitted-state result placeholder.
- **Boundary rules now implemented**: attempts use published snapshots only, remain separate from Assessment Builder drafts, enforce learner ownership and lifecycle transitions, and keep result records as placeholders only.
- **Cross-stack proof now implemented**: learner attempt Playwright E2E now runs through the real portal frontend, real platform API, and dedicated test Postgres database.
- **011C scope now implemented**: backend grading runtime foundation now exists. Submitted attempts can be graded through deterministic backend use cases, answer-grade records and grading-run records are persisted, result placeholders can advance to `GRADED` or `PENDING_MANUAL_REVIEW`, and backend grading APIs now exist for future UI work.
- **011F–011G state**: execution kind/status/language/resource-limit contracts and ports exist, a safe noop provider is the default backend binding, and a deterministic fixture provider exists for tests/internal harnesses only.
- **Still not implemented**: real code execution, notebook execution, learner execution endpoints, sandbox isolation, auto-grading for code/notebooks, AI grading, proctoring, and Learning Delivery/Content Studio persistence linkage.

## Learning Delivery implementation truth

- The Learning Delivery backend slice is implemented and validated through API/integration coverage.
- The portal now includes the first Learning Delivery frontend foundation:
  - creator course list and detail shells
  - learner enrollment shell routes
  - typed frontend Learning Delivery contracts
  - a dedicated Learning Delivery API client boundary
- The first cross-stack Learning Delivery E2E slice now proves:
  - creator course creation, section/lesson authoring, and publishing
  - learner enrollment, lesson progress completion, and enrollment completion
  - missing-context and cross-workspace error behavior against the real backend
- This slice is still intentionally foundational only; it does not yet include the advanced content editor, assessments/exams, analytics dashboard, media uploads, certificates, full production auth/session frontend integration, or advanced learner catalog UX.

## Task 011G Update (2026-05-19)

- Manual grading UI now exists for creator/admin review.
- Creator/admin can view pending manual-review answers, open grading runs, and submit manual score + feedback.
- Learner result page and result release workflow now exist.
- Code execution grading, notebook execution grading, AI grading, and proctoring are not implemented yet.
- Safe backend-only code execution request/get/cancel use cases now exist for internal harness use.
- Production default execution provider does not execute code.
- Test/internal fixture execution provider does not execute source; it returns explicit deterministic fixture results only.
- Learning Delivery is not connected to Assessment grading.
- Content Studio is not connected to Assessment grading.
- Learners still have no execution endpoint.

## Task 011F Update (2026-05-19)

- Execution runtime prep added: execution kind/status/language/resource-limit contracts, reserved execution requests/results, and provider ports.
- CODE/NOTEBOOK grading remains pending manual review; no execution provider or sandbox exists yet.
- Learners still have no execution endpoints.

## Assessment Result Release

Creators and admins can release graded assessment results to learners. Learners can view only released results, including score, max score, release timestamp, and safe answer feedback when present. Correct answer keys are not exposed by default.

## Task 011H Update (2026-05-19)

- Roadmap rebase: 011F and 011G remain safe execution-prep only. No real execution provider integration exists yet.
- Assessment attempt lifecycle now has a reliability/concurrency baseline:
  - repeated start returns the existing in-progress attempt;
  - repeated answer save remains an upsert on the same answer row;
  - repeated submit returns the submitted attempt and does not duplicate grading/result/audit/outbox side effects.
- Timer boundary behavior is now defined and tested: attempts at or past expiry cannot save or submit.
- First-load route baselines now exist for the main assessment learner/creator pages.
- Next planned assessment task is 011I for UX hardening and question-type expansion. Media Library remains after the assessment reliability and UX hardening work.

## Task 011I Update (2026-05-20)

- Assessment Builder authoring, attempt runtime, learner attempt UI, grading runtime, manual grading UI, result release, learner result pages, and reliability/concurrency baseline now all exist together.
- Assessment UX hardening now exists for timer clarity, save/submission retry states, offline/reconnect messaging, unsupported-question fallback, and safer first-load/error rendering.
- `READING_PASSAGE` now exists as a zero-point context block in builder snapshots and learner runner rendering.
- `FILE_UPLOAD` now exists only as a placeholder boundary with metadata and disabled learner UX until Media Library work lands.
- Real uploads, Media Library, object storage adapters, signed URLs, real code execution, notebook execution, AI grading, proctoring, and Learning Delivery/Content Studio linkage still do not exist.
- Next planned task is Task 012A — Media Library Domain and Storage Adapter.

## Task 012B Update (2026-05-21)

- Creator/admin workspace users can now open a Media Library route in the portal.
- The Media Library frontend supports upload-intent creation, direct signed uploads, upload completion, asset listing, signed read URL preview/open flows, and archive actions.
- Media uploads still go directly to signed object-storage URLs; platform-api does not receive raw file bytes or base64 file payloads.
- Assessment file-upload placeholders, Content Studio embeds, and Learning Delivery media usage remain disconnected in this task.

## Communication Center

- Communication Center backend/domain foundation now exists for workspace-scoped notification templates and notification intents.
- Provider-agnostic `EMAIL`, `SMS`, and `IN_APP` contracts are available, but no real email or SMS provider is integrated.
- Notification templates can be created, rendered safely with declared variables, archived, and used to create queued intents.
- Notification delivery remains non-production by default through noop/fixture provider behavior only.
- Outbox append is idempotent by `eventId`; duplicate appends return the existing row and preserve the original payload.
- An internal Communication Scheduler foundation can now process due queued intents through noop/fixture providers only.
- Assessment, Learning Delivery, Media Library, and Content Studio events are not connected to Communication Center yet.
- Communication Center supports queued notification intents and delivery-attempt tracking, but real email/SMS provider activation remains future work.
- Notification inbox UI, preferences UI, and campaign/broadcast tooling are still not part of the current product slice.

# Notification Inbox and Preferences

- Authenticated workspace users now have an in-app notification inbox foundation in the portal.
- Users can manage their own workspace-scoped notification preferences for `IN_APP`, `EMAIL`, and `SMS` channels without enabling live provider delivery.
- Provider configuration remains backend-only and environment-controlled; no real email or SMS sending is enabled by this product surface.

## Task 014A Additions

- Workspace admins and owners now have a workspace-scoped dashboard foundation for operational counts and recent activity.
- Campaign management is now a draft, preview, archive, and schedule foundation only.
- Live mass campaign delivery remains deferred and disabled by default.

## Task 014C Additions

- Creator dashboard analytics now use normalized outbox activity plus workspace-scoped read models over existing product tables.
- Dashboard summary and metric responses stay safe by excluding unreleased assessment scores, raw outbox payloads, and provider secrets.
- Assessment pending-grading counts only include truly pending states; graded-but-unreleased results remain separate from grading backlog.
- Multi-workspace dashboard access continues to respect workspace tenant boundaries through permission checks.

## Task 014E Additions

- Assessment attempts now support an optional metadata-only proctoring gateway foundation with explicit learner disclosure.
- The current monitoring mode records only safe browser activity metadata such as focus, visibility, fullscreen, online/offline, and copy/paste attempt markers.
- The product still does not capture webcam, screen, audio, clipboard contents, raw keystrokes, biometric data, or hidden background surveillance.

## Task 014H Additions

- Assessment security policy configuration is now persisted per assessment in the workspace scope.
- Proctoring defaults to OFF unless a creator explicitly enables metadata-only BASIC_EVENT_MONITORING.
- Creators can safely configure disclosure copy, heartbeat cadence, and bounded incident thresholds without enabling webcam, screen, audio, biometric, or raw keystroke capture.
- Learner disclosures reflect the configured policy and still do not expose private grading data, unreleased scores, or raw event payloads.
