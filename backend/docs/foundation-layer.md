# Backend Foundation Layer Conventions

This document defines concrete conventions implemented in the initial platform foundation.

## Purpose

The foundation layer provides shared runtime primitives required by all domain modules without introducing product/business features.

## Implemented contracts (ports)

From `@mentrily/service-core`:
- `RequestContext`
- `WorkspaceContext`
- `PermissionEvaluator`
- `EntitlementEvaluator`
- `AuditRecorder`
- `OutboxPublisher`

These are consumed via DI tokens:
- `PERMISSION_EVALUATOR`
- `ENTITLEMENT_EVALUATOR`
- `AUDIT_RECORDER`
- `OUTBOX_PUBLISHER`

## Runtime conventions

- Correlation/request ID middleware sets and returns `x-request-id` and `x-correlation-id`.
- Tenant/workspace headers can be mapped into request context when provided.
- Environment validation occurs at bootstrap through `validatePlatformEnvironment`.
- Shared error envelope is emitted via a global exception filter using `AppError` + `toErrorEnvelope`.

## Health model

- `GET /health` returns liveness + request ID echo.
- `GET /ready` returns readiness payload for runtime checks.

## Notes

- Default evaluator/audit/outbox providers are placeholders only.
- Domain modules must replace placeholder providers with concrete adapters as they are implemented.
- No product-level business logic belongs in foundation components.
