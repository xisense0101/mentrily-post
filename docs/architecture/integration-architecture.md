# Integration Architecture

## Ports and adapters first

Provider integrations (Clerk, WorkOS, Stripe, email providers, telemetry providers) are isolated behind ports/adapters to prevent domain lock-in.

## Runtime allocation

- Core orchestration remains in `platform-api` / `platform-worker`.
- High-concurrency or integration-intensive connector execution uses Go runtime.
- Execution providers must be isolated behind ports/adapters; 011G wires a noop default provider and a fixture-only test provider, but no real external executor or sandbox is integrated yet.

## Webhook design

- Inbound webhooks terminate at protected edge/application boundaries.
- Signature verification, replay protection, and idempotent processing are mandatory.
- Outbound webhooks use retry policy and dead-letter strategy.

## Failure handling

- Media object storage is now modeled as a port/adapter contract.
- 012A ships only fixture/noop adapters; no real cloud adapter is required for tests.
- Integration DB cleanup (`truncatePublicSchema`) uses an advisory lock to avoid deadlocks during concurrent runs.

- Retries with backoff for transient failures.
- Dead-letter queues for poison events.
- Operational visibility via observability toolkit.

## Task 011H Update (2026-05-19)

- The roadmap is rebased away from immediate real execution-provider integration.
- Assessment delivery currently exposes only safe execution-prep boundaries from 011F/011G; there is still no real external executor, learner execution endpoint, notebook execution path, or AI grading integration.
- Reliability work in 011H focuses on transactional lifecycle correctness, not new integrations.

## Task 011I Update (2026-05-20)

- Assessment UX hardening and question-type expansion did not add any new external integrations.
- File upload remains a placeholder boundary only. There is still no Media Library integration, object storage adapter, signed URL exchange, webhook, or media-processing dependency.
- Assessment remains intentionally disconnected from Learning Delivery and Content Studio runtime flows.
## Task 012B Update (2026-05-21)

- The Media Library frontend integrates with platform-api only for control-plane actions:
  - create upload intent
  - complete upload
  - list/get asset
  - create signed read URL
  - archive asset
- File transfer itself goes directly from browser to signed storage URL and is not proxied through platform-api.

## Communication Center

- Communication Center currently integrates only with internal audit/outbox persistence and fixture/noop delivery abstractions.
- There is no real Resend, SendGrid, SMTP, Twilio, WhatsApp, Firebase, Expo, or OneSignal integration in this task.
- The scheduler foundation is intentionally internal-only and limited to noop/fixture delivery providers until provider adapters are introduced behind feature flags.
- Task 012E adds reserved Communication adapter boundaries only.
- No Resend, SendGrid, SMTP, Twilio, WhatsApp, Firebase, Expo, or OneSignal SDK/API integration exists yet, and live delivery remains disabled by default.

## Task 013A Update (2026-05-22)

- The Media Library is fully integrated into the Learning Delivery module:
  - Implemented strict server-side media reference validation (`validateLearningMediaReference`) enforcing tenant/workspace isolation, asset existence, availability status, and kind-category alignment (e.g., VIDEO kind matches VIDEO category).
  - Wired `MediaAssetRepository` into `AddLearningLessonUseCase` to validate references during lesson creation.
  - Refactored `mapCourseToResponse` in the mapping layer to asynchronously resolve media asset details and attach them to `LearningLessonContract` using the `MediaAssetRepository`.
  - Integrated the frontend lesson create form with the `AssetPickerDialog` to select media assets directly.
  - Added `EditableMediaBlock` to render `IMAGE`, `VIDEO`, and `FILE` kind blocks dynamically in both editable and read-only preview modes using the signed URL resolver hook `useMediaReadUrl`.
