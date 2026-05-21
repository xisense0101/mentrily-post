# Backend Workspace

The backend follows a modular monolith-first architecture with controlled deployable runtimes.

## Applications

- `applications/platform-api`: NestJS + Fastify modular monolith for core product APIs.
- `applications/platform-worker`: NestJS worker for async jobs, queues, schedules, emails, exports.
- `applications/go-runtime`: Specialized Go runtime nodes for connectors and high-concurrency workloads.

## Packages

Shared backend packages provide contracts, events, security, observability, storage, and testing utilities.

## Domain boundaries

`platform-api` module boundaries are business/domain oriented and not role-oriented:

- identity-access
- workspace-governance
- content-studio
- learning-delivery
- assessment-delivery
- commercial-operations
- credentialing
- communication-center
- integration-hub
- intelligence
- platform-operations
- media-library
