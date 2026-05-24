# Learner-Creator Model

## Principle

Learner and creator are interaction modes, not permanent identities.

## Behavior

- A creator can enroll as a learner in another workspace context.
- A learner may gain creator permissions without account migration.
- UX should switch experiences based on active workspace + permissions.

## Design implications

- Avoid mutually-exclusive account states.
- Keep personal free mode simple.
- Keep permission and entitlement checks explicit in both UI and API flows.
- Creators author draft `ContentDocument` records inside Content Studio before any learner-facing delivery exists.
- Draft versions and draft block trees are creator-only authoring state.
- Published content snapshots are the durable output learners should eventually consume through Learning Delivery once that linkage is implemented.

## Media note

- Learner-facing upload workflows are not enabled yet.
- Creator/admin media APIs exist only as backend foundation in 012A; frontend upload and picker flows remain deferred.
- Content Studio authoring now goes through real backend APIs with permission checks, transaction boundaries, audit records, and persisted outbox events.
- The portal now exposes the first Content Studio authoring shell for creators: document list/create, draft block editing, and publish/archive/restore actions.
- That creator shell now also has a first cross-stack E2E slice through the real browser and backend, using test-only request-context injection until production auth/session wiring is complete.
- That authoring shell still intentionally excludes drag-and-drop UI, slash-command UI, collaborative editing, AI generation, media uploads, rich WYSIWYG behavior, and assessment-builder behavior.
- Learning Delivery now has separate creator and learner portal shells:
  - creators manage course lists, details, sections, lessons, publishing, and archiving
  - learners manage enrollments, inspect course outlines, and record lesson progress
- These frontend flows stay contract-aligned with the backend and rely on backend permissions and entitlements as the source of truth.
- The current learner discovery surface is intentionally minimal: enrollment uses a known published `courseId` during this foundational slice instead of a full learner catalog UX.
- Current cross-stack E2E uses test-only request-context injection to simulate creator and learner workspace context. This is a temporary harness, not a claim of production-complete auth/session behavior.

## Assessment Builder in creator/learner model

- Creators now author assessments (exams, quizzes, practice assignments) through the Assessment Builder UI. The current creator-side shell covers list/create, editor access, draft content editing, publish, archive, and restore flows.
- The Assessment Builder frontend authoring shell now exists for creators and has real cross-stack E2E coverage.
- Learner assessment attempt backend/runtime foundation and learner-facing attempt UI now both exist.
- Draft assessments are creator-side-only authoring state, not learner-visible.
- Published assessment snapshots are what learners will later attempt, grade, and receive results from.
- Learner assessment-taking now has backend attempt lifecycle support (start, save draft answers, submit, cancel) against published snapshots.
- Learner attempt frontend now exists for start/resume, published-snapshot question rendering, draft answer save, submit, submitted-state review, and learner-owned attempt listing.
- Learner attempt frontend reads published snapshots through learner-safe attempt snapshot access instead of exposing creator draft content.
- Grading runtime foundation now exists on the backend for deterministic scoring and manual-review placeholders, and creator/admin manual grading plus result release now exist.
- Execution runtime now has safe backend-only adapters: a noop default provider and a deterministic fixture provider for tests/internal harnesses only. CODE/NOTEBOOK still remain pending manual review.
- Proctoring is deferred.
- Code execution and AI generation are also deferred, even though code and notebook questions are structurally modeled in the domain.

## Task 011G Update (2026-05-19)

- Manual grading UI now exists for creator/admin review.
- Creator/admin can view pending manual-review answers, open grading runs, and submit manual score + feedback.
- Learner result page now exists.
- Result release workflow now exists.
- Code execution grading, notebook execution grading, AI grading, and proctoring are not implemented yet.
- No learner execution endpoint exists.
- Learning Delivery is not connected to Assessment grading.
- Content Studio is not connected to Assessment grading.

## Assessment Result Roles

Learners can read only their own released assessment results. Creators, admins, and owners can review workspace assessment results and release graded results after manual review is complete.

## Task 011H Update (2026-05-19)

- Learner retries are now part of the supported model: repeated start resumes the same active attempt, repeated submit resolves to one submitted state, and expired attempts are blocked.
- Creator/admin release remains a single transition. Repeated release attempts are rejected without duplicating release side effects.
- No real learner code execution, notebook execution, AI grading, or proctoring exists.

## Task 011I Update (2026-05-20)

- Creators can now add reading-passage context blocks and file-upload placeholder questions in Assessment Builder.
- Learners now see reading passages as non-answerable context and file-upload questions as explicit placeholders that defer real uploads to the future Media Library slice.
- Learner attempt UX now exposes timer urgency, local expiry disablement, save retry feedback, submit retry feedback, and offline/reconnect warnings.
- Unsupported assessment question kinds now fail safely in both creator and learner UIs.
- Real uploads, Media Library, real code execution, notebook execution, AI grading, proctoring, and Learning Delivery/Content Studio linkage remain deferred.

## Task 012B Update (2026-05-21)

- Creator/admin users now have a workspace Media Library management surface.
- Learners do not receive direct Media Library management UI in this task.
- Signed read URLs are requested only when a creator/admin opens or previews an allowed asset.
- Assessment learner file-upload placeholders still do not connect to Media Library yet.

## Communication Center

- Workspace owners, admins, and creators can manage notification templates and intents through backend APIs.
- Learners do not receive template-management capabilities in this task.
- `IN_APP` exists only as a persisted communication boundary for future inbox work; no learner inbox UI is delivered yet.
- Scheduler processing is reserved for internal/system actors only; creators, viewers, and learners do not receive a scheduler trigger surface in 012D.
- Learners and creators do not receive any direct provider-configuration capability in Task 012E.
- Communication provider enablement remains environment-only and internal to backend operations.

# Notification Ownership

- Learners, creators, admins, and workspace owners can only view and update their own notification inbox and preference records through the portal.
- Notification preferences remain tenant/workspace scoped and do not grant access to provider operations or workspace-wide notification administration.

## Task 014A Additions

- Learners remain excluded from workspace campaign management.
- Creators can still interact with existing learning/content workflows, while campaign write access remains policy-controlled.
- Dashboard data is read-only and scoped to the active workspace context.
