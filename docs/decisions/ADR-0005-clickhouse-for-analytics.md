# ADR-0005: ClickHouse for Analytics

## Status
Accepted

## Decision
ClickHouse is reserved for analytics warehouse workloads.

## Rationale
Columnar storage and query performance for high-cardinality product analytics.

## Consequences
Operational dashboards avoid expensive OLTP scans and use precomputed analytics models.
