# Security Standard

- Permission-based authorization only.
- Validate and sanitize all inbound input.
- Protect privileged operations with audit logs.
- No secrets in source code.
- Enforce webhook signature verification and replay protection.
- Execution runtimes must be isolated, must not receive database credentials, and must enforce strict resource limits.
- The 011G default `platform-api` execution binding must remain non-executing. Test fixtures may simulate results, but they must never run learner source or notebook payloads.

## Task 011H Update (2026-05-19)

- Assessment lifecycle mutations must continue to trust tenant/workspace/actor context from request context only, never from request bodies.
- Retry safety must not weaken authorization: repeated start/save/submit/release still require the same permission and ownership checks as the first request.
- No real execution provider, notebook execution, AI grading, or proctoring capability was added in this task.

## Task 011I Update (2026-05-20)

- Timer warnings and offline states remain client hints only; the backend is still authoritative for expiry and submission enforcement.
- File upload remains a disabled placeholder boundary. No binary upload, signed URL issuance, object storage credential exposure, or media processing path was added.

## Task 012A Update (2026-05-20)

- Media Library issues signed upload/read URL contracts but still forbids raw file-byte ingestion through `platform-api`.
- Private asset access is restricted to ownership or authorized workspace visibility checks.
- No public/CDN asset delivery, virus scanning, or media processing was added.
- Real code execution, notebook execution, AI grading, and proctoring remain absent, keeping the current assessment attack surface intentionally narrow.

## Task 012B Update (2026-05-21)

- Signed upload URLs and signed read URLs must not be logged or persisted in localStorage/sessionStorage.
- Private media assets must not be exposed without backend-issued signed access checks.
- The frontend must not bypass backend permission checks or trust tenant/workspace identifiers from mutation bodies.

## Communication Center

- Communication Center must enforce workspace ownership checks after loading templates or intents.
- Private recipient details must remain permission-gated and must not be leaked into logs, events, or outbox payloads beyond what is required.
- Real provider credentials are out of scope for 012C and must not be introduced.
- `communication.scheduler.process` is reserved for internal/system scheduler execution and is not granted to learner, viewer, creator, workspace admin, or workspace owner role presets by default.
- Task 012E keeps provider enablement environment-only; there is no learner, viewer, creator, admin, or owner live-provider override.
- Reserved email/SMS adapters must fail closed when feature flags or `COMMUNICATION_ALLOW_LIVE_DELIVERY` disable live delivery.
- Provider secrets must not appear in contracts, events, logs, failure metadata, or env example values.

# Notification Security Posture

- Own-notification and own-preference APIs require authenticated actor context and explicit own-record permissions.
- Provider configuration is backend-only and must not be surfaced in notification inbox/preferences routes, contracts, logs, or frontend UI.

## Task 013C & 013C1 Updates (2026-05-22)

- **Strict Scanning Enforcements**: Read URLs must never be generated for un-scanned (`SCAN_QUEUED`, `SCANNING`), failed (`SCAN_FAILED`), or malicious (`INFECTED`, `QUARANTINED`) media assets. Read URL access is strictly limited to assets marked as `AVAILABLE` and with a `CLEAN` scan status.
- **Pre-selection Restrictions**: Interactive media selection components (e.g. Asset Picker, Content Editor, Learning Delivery) must block selectors from choosing assets with unsafe or pending scan states.
- **Asset Reference and Safe Exclusions**: The `MediaLifecycleWorker` must not delete any media asset that is actively referenced in another module (such as `LearningLesson`, `ContentBlock`, `AssessmentQuestion`, or `AssessmentAttemptAnswer`). Lifecycle exclusion checks are mandatory to prevent active course/assessment file reference corruption.
- **Verification Hook Rules**: Save/mutation requests in Content Studio or Learning Delivery must evaluate and validate the status of referenced media assets at validation time, failing if referenced assets are infected, deleted, or in unauthorized states.

## Task 013D Update (2026-05-23)

- Media processing templates must remain typed configuration only. They must not contain executable code, secrets, webhook URLs, or provider credentials.
- Media processing hooks must execute only registered backend handlers. `eval`, `new Function`, arbitrary JavaScript, and live outbound provider/webhook calls are prohibited by default.
- Media processing must not bypass `MediaAccessPolicyService`, must not trust tenant/workspace identifiers from request bodies, and must not promote non-clean media into readable/usable states.
- Frontend-safe media contracts may expose template keys, deferred rendition summaries, and hook stage summaries, but must not expose storage keys, bucket paths, origin URLs, or scanner internals.

## Task 014A Additions

- Dashboard and campaign reads must remain workspace-scoped and permission-enforced.
- Audience preview must never accept arbitrary raw email or phone inputs for this foundation.
- Live provider delivery remains disabled by default for campaign flows.
