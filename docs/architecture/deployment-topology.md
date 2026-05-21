# Deployment Topology

## Primary deployables

- `frontend/apps/portal`: web application deployment.
- `backend/applications/platform-api`: API runtime.
- `backend/applications/platform-worker`: worker runtime.
- `backend/applications/go-runtime`: specialized runtime nodes.
- Cloudflare workers: `tenant-router`, `webhook-shield`, `asset-guard`.

## Environment model

- Local, staging, production with parity in core dependencies.
- Config via environment variables and runtime configuration adapters.

## Data plane dependencies

- Postgres (primary transactional data)
- Redis (cache/locks/queues)
- Object storage (media/artifacts)
- ClickHouse (analytics later)

## Operational posture

- Separate scaling knobs for API, worker, and Go nodes.
- Edge and observability controls applied consistently across environments.
