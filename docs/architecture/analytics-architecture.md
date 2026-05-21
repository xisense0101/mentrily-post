# Analytics Architecture

## Capture strategy

- Capture product events at domain boundaries.
- Forward normalized events to analytics pipelines.
- Preserve tenant/workspace metadata for segmentation.

## Warehouse model

- ClickHouse is reserved for large-scale analytics storage and query workloads.
- OLTP Postgres remains optimized for transactional consistency.

## Read models and dashboards

- Precompute heavy aggregations into analytics read models.
- Serve creator and enterprise dashboards from analytics paths, not hot OLTP joins.

## Critical constraint

Heavy analytical queries must not hammer primary Postgres at scale.
