# Modular Monolith

## Why not microservices first

- Team size (5 engineers) benefits from shared code, lower operational overhead, and faster iteration.
- Domain boundaries can be enforced inside one codebase and one deployable API runtime.
- Premature service sprawl increases coordination, infra burden, and debugging complexity.

## Domain boundaries

`platform-api` bounded contexts:
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

## Service extraction criteria (later)

A module may become a separate service only when:
- scaling profile is materially different,
- failure isolation provides clear business value,
- deployment cadence diverges,
- and ownership boundaries are stable.

## Forbidden coupling

- No direct cross-module writes.
- No leaking domain internals across module APIs.
- No provider-specific infrastructure concerns in domain layer.
