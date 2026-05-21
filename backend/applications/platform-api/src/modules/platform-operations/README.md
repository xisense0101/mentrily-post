# Platform Operations Module

Manages global platform settings, logs, and system-wide operations.

## Layers

- **presentation/**: Admin API controllers and platform monitoring DTOs.
- **application/**: Orchestrates global config changes, audit log exports, and maintenance tasks.
- **domain/**: `GlobalConfig`, `AuditLog`, `SystemEvent` entities and operational logic.
- **infrastructure/**: Logging and monitoring provider adapters.
- **tests/**: Global configuration and audit log integrity tests.
