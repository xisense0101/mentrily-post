# Enterprise Transition Roadmap (12 Sprints)

## Sprint 0: Architecture lock

- Finalize domain boundaries and ADR baseline.
- Freeze naming, module, and integration standards.
- Establish CI quality gates and branch policies.

## Sprint 1: Platform foundation

- Bootstrap monorepo CI, lint, tests, release scaffolding.
- Set up platform-api, worker, and edge skeleton hardening.
- Establish observability baseline.

## Sprint 2: Identity + tenancy

- Implement identity-access and workspace-governance vertical foundations.
- Add tenant context propagation and permission evaluation scaffolding.
- Add audit hooks for privileged actions.

## Sprint 3: Plans + entitlements

- Implement commercial-operations entitlement engine boundary.
- Wire plan-to-entitlement resolution contracts.
- Enforce seat constraints and feature gates in a central policy layer.

## Sprint 4: Worker + events + media

- Establish outbox/inbox pipelines and worker processing patterns.
- Stand up media-library storage adapter baseline.
- Add idempotency and retry/dead-letter strategy.

## Sprint 5: Learning vertical slice

- Deliver first learning-delivery end-to-end slice.
- Include enrollment, progress projection, and permission checks.

## Sprint 6: Content studio

- Deliver authoring baseline for content-studio.
- Add draft/publish workflow skeleton and audit events.

## Sprint 7: Assessment vertical slice

- Deliver assessment-delivery baseline with attempt orchestration.
- Add result events and read model projections.

## Sprint 8: Integration hub

- Implement integration-hub adapter framework.
- Add inbound/outbound webhook lifecycle with signing and retries.

## Sprint 9: Go connector runtime

- Implement connector-node operational baseline.
- Integrate with integration-hub contracts and observability.

## Sprint 10: Analytics

- Establish analytics event pipeline to warehouse boundary.
- Create dashboard read-model jobs and first analytics views.

## Sprint 11: Cloudflare + performance

- Harden tenant routing, edge cache, and signed asset controls.
- Performance tuning across frontend/API/worker and critical queries.

## Sprint 12: Migration + hardening

- Expand/contract cleanups, security hardening, and reliability drills.
- Release readiness review and enterprise onboarding runbooks.
