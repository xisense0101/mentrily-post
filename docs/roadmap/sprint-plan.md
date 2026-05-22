# Sprint Plan Template (2 Weeks)

## Sprint goal

Define one measurable product/platform outcome aligned to roadmap stage.

## Tickets

Each ticket includes:

- problem statement
- target module/boundary
- acceptance criteria
- test expectations
- observability/audit impact

## Acceptance criteria

- Functional behavior is explicit and testable.
- Tenancy, permission, and entitlement conditions are covered.
- Non-goals are documented.

## Demo expectation

- Show end-to-end behavior in staging-like environment.

## Current roadmap note

- After 012A the next planned product task remains 012B for frontend media workflows, but only once backend remediation/validation is green.
- Include happy path + one failure/edge case.

## Task 012B Update (2026-05-21)

- Media frontend workflow foundation is now implemented.
- The next roadmap choice returns to either Communication Center domain work or explicit Media integration work, depending on whether cross-domain media linkage should happen before messaging features.

## Definition of Done

- Code merged with reviews.
- Tests passing (unit/integration/e2e as applicable).
- Docs updated.
- Monitoring and runbook notes updated where needed.

## Task 011H Roadmap Rebase (2026-05-19)

- Current task: Task 011H — Assessment Reliability and Concurrency Baseline.
- Rebase note: 011F and 011G were safe execution-prep only and did not add real code execution.
- Task 011I — Assessment UX Hardening and Question-Type Expansion is now complete.
- Immediate next planned task after successful validation: Task 012A — Media Library Domain and Storage Adapter.
- Media Library remains after assessment reliability and UX hardening.

## Current Progress

- Task 012D establishes outbox `eventId` idempotency and the internal Communication Scheduler foundation after Communication Center backend/domain stabilization.
- The next planned slice after a clean validation is Task 012E — Communication Provider Adapter Prep Behind Feature Flags.
- Task 012E adds provider adapter preparation only: safe config, feature flags, registry/factory, and disabled reserved email/SMS stubs.

# Communication Sprint Note

- `012F` now includes the portal Notification Inbox and Notification Preferences foundation on top of the existing Communication Center backend.
- `012G` should not begin until the full package/backend/portal/integration/root/E2E validation matrix is green for the completed `012F` surface.
