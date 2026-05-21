# Learning Delivery domain (008A)

This module contains the domain model for Learning Delivery (courses, sections, lessons, enrollments, and progress).

What exists after 008A:

- Domain entities
- Value objects
- Repository contracts (no persistence implementations)
- Domain services (publish + completion policies)
- Domain unit tests

Deferred to 008B:

- Prisma schema and migrations
- Persistence adapters and repository implementations
- HTTP controllers and application use-cases
- Outbox/audit integration and worker logic

# Learning Delivery Module

Handles the delivery of content to learners, including enrollment and progress tracking.

## Layers

- **presentation/**: Delivery API controllers and learner-facing DTOs.
- **application/**: Orchestrates enrollment, progress updates, and completion checks.
- **domain/**: `Enrollment`, `ProgressRecord` entities and completion rules.
- **infrastructure/**: Progress persistence and event publishers.
- **tests/**: Delivery logic and progress calculation tests.
