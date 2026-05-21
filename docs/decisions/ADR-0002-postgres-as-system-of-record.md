# ADR-0002: PostgreSQL as System of Record

## Status
Accepted

## Decision
PostgreSQL is the authoritative transactional datastore.

## Rationale
Strong consistency, mature ecosystem, and reliable transactional semantics.

## Consequences
Analytics-heavy workloads are moved to warehouse/read models instead of OLTP abuse.
