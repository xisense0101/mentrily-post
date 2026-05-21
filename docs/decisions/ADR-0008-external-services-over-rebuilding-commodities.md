# ADR-0008: External Services over Rebuilding Commodities

## Status
Accepted

## Decision
Use managed providers for commodity capabilities (auth, billing, email, telemetry) via adapters.

## Rationale
Faster delivery, lower maintenance burden, and better specialization.

## Consequences
Provider logic must remain isolated behind ports/adapters to preserve replaceability.
