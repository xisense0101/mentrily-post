# Integration Hub Module

The central point for third-party integrations, webhooks, and API keys.

## Layers

- **presentation/**: Integration settings and webhook API controllers.
- **application/**: Orchestrates app connections, webhook delivery, and API key lifecycle.
- **domain/**: `Integration`, `Webhook`, `ApiKey` entities and security logic.
- **infrastructure/**: Third-party API clients and webhook delivery workers.
- **tests/**: Webhook signature and API key validation tests.
