# Module Boundary Standard

- Every backend domain module must use `presentation/application/domain/infrastructure/tests`.
- Cross-module communication occurs through contracts, events, or explicit application interfaces.
- Direct cross-module DB writes are forbidden.
- Role-based modules (student/teacher/admin) are forbidden as backend boundaries.
