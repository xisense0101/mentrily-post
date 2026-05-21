# Content Studio backend foundation (009B)

Content Studio is Mentrily's reusable authoring foundation for block-based documents.

What exists after 009B:
- Domain model preserved from 009A
- Prisma schema, migration, and repository adapters
- HTTP APIs and application use cases
- Permission checks, audit records, and outbox persistence inside mutating transactions
- DB-free unit tests and DB-backed integration tests

Deferred to 009C:
- Frontend editor UI
- Drag-and-drop and slash command experience
- AI-assisted authoring flows

Reuse direction:
- Course builder and lesson builder reuse the same block-document foundation
- Future exam and question builders reuse the same model through reserved assessment purposes and block kinds
- Assessment-reserved block types exist in persistence/API contracts only; no assessment behavior is implemented in 009B
- Learning Delivery is still not linked directly to Content Studio documents
- Request-path handlers persist outbox events only; they do not publish externally
