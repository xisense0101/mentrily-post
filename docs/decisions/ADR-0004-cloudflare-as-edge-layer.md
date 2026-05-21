# ADR-0004: Cloudflare as Edge Layer

## Status
Accepted

## Decision
Cloudflare handles DNS/CDN/WAF/rate limiting/bot protection/tenant routing.

## Rationale
Global edge capabilities with integrated security and routing controls.

## Consequences
Edge responsibilities are centralized and audited; origin assumes trusted edge headers/contracts.
