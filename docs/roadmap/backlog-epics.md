# Backlog Epics

## Platform foundation

- Ticket: CI baseline with lint/test/typecheck gates.
- Ticket: environment config contracts and secrets policy.

## Identity and tenancy

- Ticket: workspace membership policy evaluator.
- Ticket: tenant context propagation middleware.

## Commercial foundation

- Ticket: entitlement resolver service and policy adapter.
- Ticket: seat allocation enforcement flow.

## Learning

- Ticket: enrollment aggregate + projection read model.
- Ticket: learner progress event stream.

## Content studio

- Ticket: draft/publish command handlers.

## Media library

- Ticket: backend media metadata and upload intent foundation.
- Ticket: frontend upload workflows and asset picker.
- Ticket: media processing, virus scan, and lifecycle hardening.
- Ticket: content version metadata model.

## Task 012B Update (2026-05-21)

## Media library

- Ticket complete: frontend upload workflows and asset picker foundation.
- Ticket remaining: assessment/content/learning integrations.
- Ticket remaining: media processing, virus scan, and lifecycle hardening.

## Assessments

- Ticket: assessment attempt lifecycle service.
- Ticket: score processing and result publish event.

## Integrations

- Ticket: provider adapter registry.
- Ticket: inbound webhook verification pipeline.

## Analytics

- Ticket: event normalization for warehouse ingest.
- Ticket: creator dashboard read model job.

## Edge/performance

- Ticket: tenant router cache strategy.
- Ticket: signed asset validation worker.

## Migration/hardening

- Ticket: expand/contract migration playbook automation.
- Ticket: chaos/retry/idempotency verification suite.

## Task 011H Update (2026-05-19)

## Assessments

- Ticket: assessment reliability and concurrency baseline for start/save/submit retry safety.
- Ticket: assessment UX hardening and question-type expansion (next after 011H when validation passes).

## Deferred

- Ticket: real code execution provider integration (explicitly paused after 011G safe execution-prep work).
- Ticket: media library domain and storage adapter (planned after assessment reliability and UX hardening).

## Task 011I Update (2026-05-20)

## Assessments

- Ticket: learner timer/save/offline UX hardening.
- Ticket: reading passage question support in builder and learner runner.
- Ticket: file upload placeholder boundary before Media Library.
- Ticket: unsupported assessment question fallback handling.

## Next

- Ticket: Task 012A — Media Library Domain and Storage Adapter.

## Communication Center Follow-on

- Task 012C — Communication Center Domain
- Task 012D — Outbox Event Id Constraint Remediation & Communication Scheduler
- Task 012E — Communication Provider Adapter Prep Behind Feature Flags
- Task 012F — Notification Inbox Frontend and Preferences
- Follow-up Communication epic work remains: inbox frontend, preferences UI, event wiring, and any future real provider integration enablement.

# Communication Center Epic Update

- The current Communication Center epic now covers authenticated in-app inbox viewing and workspace-scoped notification preference management.
- Future backlog remains unchanged for event wiring, production worker loop, live providers, and campaign/broadcast surfaces.

## Task 014A Additions

- Dashboard analytics remains a foundation epic with richer analytics deferred.
- Campaign management remains a staged epic: draft and preview foundation now, delivery automation later.
