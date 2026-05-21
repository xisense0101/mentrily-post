# Migration Strategy

## Principle

Migrations from legacy/earlier shapes to target architecture must use explicit, reversible stages.

## Expand/contract

1. **Expand**: add compatible schema/paths first.
2. **Dual-write/read compatibility**: maintain transitional behavior.
3. **Backfill/verify**: migrate data safely with checks.
4. **Contract**: remove obsolete paths after confidence window.

## Local Migration Workflow

The project uses Prisma Migrate to manage schema evolution.

1. **Authoring**: Use `pnpm --filter @mentrily/data-platform prisma:migrate:dev` to create a new migration from schema changes. This command requires the test database to be running.
2. **Review**: Committed migrations are stored in `backend/packages/data-platform/prisma/migrations/`. These files are the source of truth for the database schema.
3. **Deployment**: Use `pnpm --filter @mentrily/data-platform prisma:migrate:deploy` to apply committed migrations to an environment (including the integration test database).
4. **No DB Push**: Do not use `prisma db push` for the normal team workflow, as it bypasses the migration baseline and can lead to schema drift.

Current slice truth:
- The original `20260513083019_add_content_studio` draft included unrelated Learning Delivery DDL generated during local Prisma drift cleanup.
- Task 009B1 reviewed that risk and trimmed the committed `add_content_studio` migration so it now creates only Content Studio enums, tables, indexes, and Content Studio foreign keys.
- No follow-up remediation migration was needed because the Learning Delivery changes were removed from the Content Studio migration before the validated baseline for this repository was finalized.
- Task 010B1 reviewed `20260514145910_add_assessment_builder` and removed accidental Learning Delivery DDL drift from that migration.
- The committed Assessment Builder migration remains Assessment-only DDL.
- The committed `add_assessment_attempt_runtime` migration is also Assessment-only DDL: it adds only attempt runtime enums/tables/indexes/foreign keys and must not mutate Learning Delivery or Content Studio tables.

## Guardrails

- **Migration Baseline**: The canonical schema history is stored under `backend/packages/data-platform/prisma/migrations/`.
- **No Destructive Migrations**: No destructive migration without documented rollback plan.
- **Tenant-level progress**: Tenant-level migration progress is observable and auditable.
- **Baseline Requirement**: Every release must have a corresponding migration baseline in the repository.
- 011C introduces additive Assessment grading tables/enums only. Migration scope is limited to `AssessmentGradingRun`, `AssessmentAnswerGrade`, and their enums/indexes; it must not rewrite prior Assessment, Learning Delivery, or Content Studio migrations.
