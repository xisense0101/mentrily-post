# ADR-0006: Outbox/Inbox Pattern

## Status
Accepted

## Decision
Use outbox for event publication and inbox for consumer deduplication/idempotency.

## Rationale
Reliable event processing with transactional consistency across async boundaries.

## Consequences
Every event producer/consumer must follow envelope and idempotency conventions.
