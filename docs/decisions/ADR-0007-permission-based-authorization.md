# ADR-0007: Permission-Based Authorization

## Status
Accepted

## Decision
Authorization is permission/policy-driven; role-based backend module boundaries are forbidden.

## Rationale
Supports flexible identities where users can be both learner and creator.

## Consequences
Role presets exist only as permission bundles; all access checks evaluate permission policies in context.
