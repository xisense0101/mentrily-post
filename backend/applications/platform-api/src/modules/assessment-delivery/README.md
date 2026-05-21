# Assessment Delivery Module

## Overview

The Assessment Delivery module is the home for Mentrily's Assessment Builder / Exam Builder domain model.

**Current phase (010A):** Domain-only. No persistence, no APIs, no frontend, no code execution runtime.

**Future phases:**

- **010B:** Persistence and Backend APIs
- **010C:** Frontend Authoring Experience
- **010D+:** Code Execution and Notebook Assessment Runtime

## Domain Concepts

### Assessment Aggregate

The root entity representing an exam, quiz, assignment, or other assessment. Assessments have:

- **Purpose:** QUIZ, EXAM, PRACTICE, ASSIGNMENT, PLACEMENT_TEST, CERTIFICATION
- **Status:** DRAFT, PUBLISHED, ARCHIVED
- **Visibility:** PRIVATE, WORKSPACE, PUBLIC_LINK, INVITE_ONLY
- **Versioning:** Draft versions for authoring, published snapshots for learner attempts
- **Grading:** Support for auto, manual, and hybrid grading
- **Attempt Policy:** Max attempts, retakes, shuffling
- **Time Limit:** Optional timed mode
- **Result Release:** Control when results are revealed

### Assessment Versions

Assessments track draft and published versions:

- **Draft Version:** Mutable, for authoring
- **Published Snapshot:** Immutable, what learners attempt
- **Versioning:** Each publish creates a new immutable snapshot

### Questions

Supported question types:

- **MCQ:** Multiple-choice, single answer
- **MULTI_SELECT:** Multiple selection
- **TRUE_FALSE:** 2-option true/false
- **SHORT_ANSWER:** Text answers with accept lists
- **LONG_ANSWER:** Long text, manual grading
- **CODE:** Code question (execution reserved for 010D+)
- **NOTEBOOK:** Jupyter notebook (execution reserved for 010D+)
- **READING_PASSAGE:** Reading passage with optional child questions
- **FILE_UPLOAD:** File submission, manual grading
- **RUBRIC_ONLY:** Manual grading by rubric

### Grading

- **Answer Keys:** Define correct answers for auto-grading
- **Grading Rules:** Configure how questions are graded
- **Rubrics:** Manual grading criteria
- **Modes:**
  - AUTO: Automatic grading
  - MANUAL: Manual review required
  - HYBRID: Automatic plus manual

## Module Structure

```
domain/
  entities/
    assessment.entity.ts
    assessment-section.entity.ts
    assessment-question.entity.ts
    assessment-version.entity.ts
    assessment-published-snapshot.entity.ts
    grading-rubric.entity.ts
    grading-rule.entity.ts
  value-objects/
    assessment-purpose.vo.ts
    assessment-status.vo.ts
    assessment-version-status.vo.ts
    assessment-visibility.vo.ts
    question-kind.vo.ts
    question-points.vo.ts
    question-option.vo.ts
    question-answer-key.vo.ts
    grading-mode.vo.ts
    result-release-policy.vo.ts
    attempt-policy.vo.ts
    time-limit.vo.ts
  services/
    question-validation-policy.service.ts
    assessment-publish-policy.service.ts
    assessment-versioning-policy.service.ts
    grading-policy.service.ts
  events/
    assessment-domain-event.ts
    assessment-events.ts
  repositories/
    assessment.repository.ts
    assessment-snapshot.repository.ts
tests/
  assessment-domain.spec.ts
  assessment-question-domain.spec.ts
  assessment-versioning.spec.ts
  assessment-publish-policy.spec.ts
  question-validation-policy.spec.ts
  grading-policy.spec.ts
  assessment-events.spec.ts
```

## Content Studio Integration (Future)

Assessment Builder will eventually reuse Content Studio's block-document model for authoring complex assessment layouts. However, in 010A, Assessment domain remains independent:

- Assessment domain has no imports/exports to Content Studio
- Question block kinds are modeled but not implemented in terms of Content blocks
- Future (010F+) will integrate Content blocks for rich question authoring
- Careful separation ensures Assessment domain can evolve independently of Content persistence

## Design Principles

1. **Domain-first:** All business logic in the domain layer
2. **No Prisma:** Persistence is abstract and deferred to infrastructure
3. **Event-sourced:** Domain events capture all significant transitions
4. **Tenant-aware:** Multi-tenancy enforced at domain level
5. **Versioning:** Separates draft authoring from published attempts
6. **Extensibility:** Future types (CODE, NOTEBOOK) reserved structurally

## Phase Timeline

| Phase | Focus              | Dependencies            |
| ----- | ------------------ | ----------------------- |
| 010A  | Domain model       | None (domain-only)      |
| 010B  | Persistence + APIs | 010A domain             |
| 010C  | Frontend builder   | 010B APIs               |
| 010D+ | Code execution     | 010C frontend + runtime |

## Testing

Domain-only tests in `tests/` verify:

- Entity lifecycles
- Validation rules
- State transitions
- Event generation
- Policy decisions

**Note:** All tests are domain-level, no database, no Prisma fixtures.

## Roadmap

After 010A completes:

1. **010B:** Add Prisma schema, implement repositories, add HTTP controllers
2. **010C:** Build Assessment Builder UI in frontend
3. **010D+:** Integrate code execution runtime (provider TBD)
4. **010E+:** Add proctoring, analytics, advanced grading
5. **010F+:** Integrate Content Studio blocks for rich authoring

## References

- Architecture: [docs/architecture/backend-architecture.md](../../../docs/architecture/backend-architecture.md)
- Product Model: [docs/product/product-model.md](../../../docs/product/product-model.md)
- Event Model: [docs/architecture/event-model.md](../../../docs/architecture/event-model.md)
