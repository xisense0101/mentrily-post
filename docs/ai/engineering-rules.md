# Engineering Rules (Non-Negotiable)

1. No role-based backend modules.
2. No tenant-scoped query without workspace/tenant context.
3. No direct cross-module writes.
4. No plan checks hardcoded inside random services.
5. No unvalidated input into application/domain layers.
6. No unaudited privileged writes.
7. No destructive migration without expand/contract plan.
8. No provider-specific logic leaking into domain modules.
9. Every new module must have tests.
10. Every write path must consider idempotency.
