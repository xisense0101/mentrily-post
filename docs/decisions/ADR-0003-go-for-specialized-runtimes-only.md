# ADR-0003: Go for Specialized Runtimes Only

## Status
Accepted

## Decision
Go is used for connector runtime and future realtime/execution nodes only.

## Rationale
Go excels for high concurrency and integration-heavy runtime needs.

## Consequences
Business-domain orchestration remains in TypeScript NestJS unless explicit exceptions are approved.
