# Communication Center Module

Backend/domain foundation for notification templates, notification intents, safe template rendering, provider-agnostic delivery contracts, notification inbox, and user preference management.

## Features

- **Notification Templates**: Dynamic template design supporting HTML/plain text and dynamic variables rendered safely using a sandbox rendering parser.
- **Notification Intents**: Transaction-safe representation of notifications queued, dispatched, failed, or cancelled across channels (`EMAIL`, `SMS`, `IN_APP`).
- **Inbox & Notification Center**: Recipient-scoped IN_APP notification retrieval with support for unread count checks, mark-read, mark-unread, and archiving operations.
- **User Preferences**: Harmonized settings for users to toggle notification channels (`EMAIL`, `SMS`, `IN_APP`) across various categories (`SYSTEM`, `COURSE`, `ASSESSMENT`, etc.).
- **Provider Infrastructure**: Port-adapter pattern with built-in feature-flag-based selection of SMS and email providers.

## System Configuration

This module does not send real email or SMS by default. `NOOP` is the default delivery provider and `FIXTURE` is test-only. Real providers (like Twilio, SendGrid) are wired behind feature flags.
