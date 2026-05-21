# Mentrily Monorepo

Mentrily is an enterprise-grade, multi-tenant AI LMS and assessment SaaS scaffold.
This repository is a production-grade starting point with architecture boundaries, standards, and documentation as source of truth.

## Repository layout

- `frontend/` Next.js 16 App Router workspace with domain-first structure and shared UI/system packages.
- `backend/` NestJS modular monolith (`platform-api`), worker runtime (`platform-worker`), and specialized Go runtime.
- `docs/` Product, architecture, standards, ADRs, roadmap, and AI engineering rules.
- `.github/` Copilot guidance, templates, and CODEOWNERS.

## Core architecture encoded here

- Modular monolith first; no microservices-first sprawl.
- Deployables:
  - `platform-api` (NestJS + Fastify)
  - `platform-worker` (NestJS jobs/queues/scheduled work)
  - `go-runtime` (connector/realtime/execution specialized runtimes)
- Data stack: Postgres + Prisma, Redis, S3-compatible object storage, ClickHouse later.
- Edge model: Cloudflare for DNS/CDN/WAF/rate limiting/bot protection/tenant routing.
- Integrations via adapters: Clerk, WorkOS, Stripe, email providers, telemetry providers.

## Quick start

### Prerequisites

- Node.js `>=22` (see `.nvmrc`)
- `pnpm` `>=10`
- Docker + Docker Compose
- Go `>=1.23` (for `go-runtime` placeholders)

### Local bootstrap

```bash
pnpm install
make infra-up
pnpm dev
```

### Common commands

```bash
pnpm lint
pnpm test
pnpm typecheck
pnpm build
make infra-down
```

## Engineering guardrails

- No role-based backend modules; permission-based authorization only.
- No direct cross-module writes.
- Tenant isolation and idempotency are required for write paths.
- Product rules and architecture are documented in `docs/` and must be treated as source of truth.

## What this scaffold intentionally does not include

- No product features yet.
- No hardcoded plan logic in domain modules.
- No provider-specific logic inside domain services.

See `docs/ai/engineering-rules.md` and `docs/architecture/system-overview.md` before starting implementation tasks.
