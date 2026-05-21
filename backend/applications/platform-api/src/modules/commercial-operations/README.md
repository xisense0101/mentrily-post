# Commercial Operations Module

Manages subscriptions, plans, billing, and feature entitlements.

## Layers
- **presentation/**: Billing and subscription API controllers.
- **application/**: Orchestrates plan changes, subscription lifecycle, and entitlement resolution.
- **domain/**: `Plan`, `Subscription`, `Entitlement` entities and pricing logic.
- **infrastructure/**: Payment gateway (e.g., Stripe) and billing persistence adapters.
- **tests/**: Entitlement gating and subscription state tests.
