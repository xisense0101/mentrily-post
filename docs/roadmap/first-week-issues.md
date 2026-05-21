# First-Week Issue List (5-Person Team)

Scope is aligned with existing `first-30-days.md` Week 1 goals and does not implement product features.

## Team composition assumption

- Engineer A: Platform/CI focus
- Engineer B: Backend architecture focus
- Engineer C: Frontend architecture focus
- Engineer D: Data/event reliability focus
- Engineer E: DevEx/docs quality focus

## Issue FW-01 — CI quality gate baseline

**Owner**: Engineer A  
**Type**: Platform foundation  
**Description**: Ensure consistent lint/typecheck/test execution for all workspace packages/apps.  
**Acceptance criteria**

- CI pipeline runs lint, typecheck, test.
- Merge policy requires green checks.
- Pipeline docs updated in `README.md` or roadmap docs.

## Issue FW-02 — Architecture compliance guardrails in review flow

**Owner**: Engineer E  
**Type**: Governance/docs  
**Description**: Operationalize review standards from docs and templates for immediate team usage.  
**Acceptance criteria**

- PR process uses checklist expectations from docs.
- Architecture/security/tenancy checks are explicit in review flow.
- No duplicate/conflicting guidance remains between docs.

## Issue FW-03 — Backend module boundary linting/conventions

**Owner**: Engineer B  
**Type**: Backend architecture  
**Description**: Establish enforceable conventions for `presentation/application/domain/infrastructure/tests` boundaries.  
**Acceptance criteria**

- Conventions are documented with examples.
- New modules can be validated against boundary rules.
- No role-based module naming appears in backend boundaries.

## Issue FW-04 — Tenant context contract definition

**Owner**: Engineer D  
**Type**: Data/security baseline  
**Description**: Define canonical tenant/workspace context contract for API and async/event flows.  
**Acceptance criteria**

- Contract includes tenant/workspace/correlation metadata requirements.
- Contract aligns with event envelope guidance.
- Missing-context behavior is documented for future implementation.

## Issue FW-05 — Permission evaluation contract definition

**Owner**: Engineer B  
**Type**: Identity baseline  
**Description**: Define interface-level contract for permission checks and audit logging expectations.  
**Acceptance criteria**

- Contract is permission/policy based (not role checks).
- Includes auditability requirements for privileged decisions.
- Includes test expectation notes for denial and cross-tenant scenarios.

## Issue FW-06 — Frontend architecture validation sweep

**Owner**: Engineer C  
**Type**: Frontend architecture  
**Description**: Confirm route-group and thin-route standards are reflected in scaffold structure and docs.  
**Acceptance criteria**

- Route group usage and thin-route guidance are documented with clear examples.
- Foundation/interface/state/contracts boundaries are clarified where ambiguous.
- No product feature implementation is introduced.

## Issue FW-07 — Eventing and idempotency baseline design doc refinement

**Owner**: Engineer D  
**Type**: Reliability architecture  
**Description**: Tighten outbox/inbox/idempotency guidance into implementation-ready checklist format.  
**Acceptance criteria**

- Checklist includes producer and consumer responsibilities.
- Event envelope requirements are unambiguous.
- Retry/dead-letter expectations are clearly scoped for sprint 4.

## Issue FW-08 — Local developer bootstrap verification

**Owner**: Engineer A  
**Type**: DevEx  
**Description**: Validate `pnpm` + Docker local bootstrap path and document known issues.  
**Acceptance criteria**

- Fresh-clone bootstrap steps are verified end-to-end.
- Any setup footguns are captured in docs.
- Team can start local dependencies and run core commands consistently.

## Issue FW-09 — Backlog hygiene for sprint 1 and sprint 2

**Owner**: Engineer E  
**Type**: Planning  
**Description**: Convert immediate roadmap priorities into issue-ready tickets with acceptance criteria style consistency.  
**Acceptance criteria**

- Sprint 1 and sprint 2 stories are represented as discrete GitHub issues.
- Each issue has clear non-goals and constraints references.
- Dependencies between issues are labeled.

## Issue FW-10 — Open architecture risk register initialization

**Owner**: Engineer E (with team review)  
**Type**: Architecture governance  
**Description**: Create/seed risk register from unresolved questions and assign owning domain/team.  
**Acceptance criteria**

- Risks are categorized (security, data, scale, integration, delivery).
- Every risk has owner + next decision checkpoint.
- Register points to source docs and ADR context.

## Suggested execution cadence (week one)

- **Day 1-2**: FW-01, FW-02, FW-08
- **Day 2-3**: FW-03, FW-04, FW-06
- **Day 3-4**: FW-05, FW-07
- **Day 4-5**: FW-09, FW-10 + team architecture review
