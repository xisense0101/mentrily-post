# System Overview

## Core components

- **Frontend**: Next.js 16 App Router in `frontend/apps/portal` with domain-first modules.
- **platform-api**: NestJS + Fastify modular monolith for product APIs.
- **platform-worker**: NestJS worker for async jobs, queues, schedules, communications, exports.
- **go-runtime**: specialized Go nodes for connectors and future realtime/execution.
- **PostgreSQL**: system of record.
- **Redis**: caching, distributed locks, and queue coordination.
- **Object storage**: R2/S3-compatible media and artifacts.
- **ClickHouse (later)**: analytics warehouse and heavy aggregations.
- **Cloudflare edge**: DNS, CDN, WAF, tenant routing, asset protection, traffic controls.
- **External services**: Clerk, WorkOS, Stripe, email provider adapters, telemetry providers.

## High-level request flow

1. Client request enters Cloudflare edge.
2. Tenant routing and protection policies resolve origin + tenant context.
3. Request reaches platform-api presentation layer.

## Media Library status

- Media Library backend/domain foundation exists in `platform-api`.
- Upload UI, scan enforcement, lifecycle cleanup, and template-driven processing now exist behind internal worker flows.
- Real image thumbnail generation is fixture-backed for the current repo and safe UI summaries are exposed to the portal.
- Video/audio transcoding, document preview rendering, production CDN signing, and production antivirus provider integration remain deferred/reserved work.

4. Application/domain layers execute use case with permission + entitlement checks.
5. Writes persist to Postgres and emit outbox events.
6. Worker and/or Go runtime process async/integration pipelines.
7. Execution runtime now has a safe adapter boundary in `platform-api`, but the production default provider does not execute code and no learner-facing execution endpoint exists.
8. Telemetry and audit trails are recorded through observability boundaries.

## Task 011H Update (2026-05-19)

- The active assessment milestone is now reliability/concurrency hardening, not real execution-provider integration.
- Start/save/submit retries are handled inside the existing `platform-api` assessment lifecycle with transactional guarantees and DB-backed race coverage.
- Learning Delivery, Content Studio, Media Library, Communication Center, proctoring, and real execution remain separate future phases.

## Task 011I Update (2026-05-20)

- The assessment slice now includes Builder authoring, learner attempt UI/runtime, grading runtime, manual grading UI, result release, learner result views, reliability baseline, and UX hardening for timer/save/offline behavior.
- `READING_PASSAGE` support now exists end to end across builder snapshots and learner rendering.
- `FILE_UPLOAD` exists only as a placeholder boundary; real asset workflows remain part of the next Media Library phase.
- Real code execution, notebook execution, AI grading, proctoring, and Learning Delivery/Content Studio linkage remain future work.

## Task 012B Update (2026-05-21)

- Mentrily now has the Media Library frontend foundation in the portal app.
- The current slice covers creator/admin asset management workflows only.
- Virus scanning, transcoding, CDN/edge delivery, and downstream media integrations remain future work.

## Communication Center

- The platform now includes a Communication Center backend foundation for safe template rendering and notification-intent tracking.
- Real delivery execution and inbox/preferences frontend work remain future slices.
- Internal scheduler processing for due queued notification intents now exists, but it is not a public product flow and does not send real email or SMS.
- Communication Center now includes explicit provider configuration, feature flags, and registry-based provider selection behind backend-only boundaries.
- Real email/SMS delivery remains intentionally inactive in all example environments.
