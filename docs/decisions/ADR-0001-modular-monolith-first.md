# ADR-0001: Modular Monolith First

## Status
Accepted

## Decision
Mentrily starts as a modular monolith in NestJS (`platform-api`) with strict domain boundaries.

## Rationale
Faster iteration for a 5-person team, lower operational complexity, and strong architectural cohesion.

## Consequences
Service extraction is deferred until scaling and ownership constraints justify it.
