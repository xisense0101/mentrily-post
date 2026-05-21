# Copilot Instructions for Mentrily

## Architecture guardrails

- Respect modular monolith boundaries and layer architecture.
- Do not create role-based backend modules.
- Keep provider integrations behind ports/adapters.
- Preserve tenant isolation in every read/write path.

## Implementation rules

- No product-rule invention; use `docs/` as source of truth.
- No hardcoded plan logic in domain services.
- No direct cross-module writes.
- Every write path must handle idempotency and audit implications.

## Quality expectations

- Add/update tests with each meaningful change.
- Keep files focused and cohesive.
- Prefer small, reviewable diffs.
