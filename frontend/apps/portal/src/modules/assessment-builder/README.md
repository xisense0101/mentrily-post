# Assessment Builder Module

Frontend authoring shell for the Mentrily Assessment Builder product.

## Scope

This module provides the creator-side UI for assessment/exam authoring. It is the exam/quiz counterpart to Content Studio.

## What's included

- **API client** — All assessment CRUD, content replace, publish/archive/restore, snapshot
- **Contract types** — Mirroring backend contract-catalog Assessment Delivery types
- **Editor state helpers** — Pure functions for local section/question management
- **Assessment list** — List, create, status/purpose badges, loading/empty/error states
- **Assessment editor shell** — Full editor UI for sections, questions, publish/archive/restore
- **Section components** — Section card, create form, section list
- **Question components** — Renderer, shell, option editor, answer key editor, kind badge
- **Editable question types** — MCQ, multi-select, true/false, short answer, long answer
- **Code question** — Structural placeholder only (no execution runtime yet)
- **Hooks** — `useAssessments`, `useAssessment` with full local state management
- **Route pages** — `/assessments` list page, `/assessments/[id]` editor page

## What's NOT included (future tasks)

- Learner attempt runtime
- Grading runtime/worker
- Code execution integration
- Proctoring
- AI generation
- Drag-and-drop question ordering
- Slash-command authoring
- Cross-stack E2E tests
- Learning Delivery / Assessment connection
- Content Studio / Assessment persistence connection

## Question types

| Kind            | Status              |
| --------------- | ------------------- |
| MCQ             | ✅ Editable         |
| MULTI_SELECT    | ✅ Editable         |
| TRUE_FALSE      | ✅ Editable         |
| SHORT_ANSWER    | ✅ Editable         |
| LONG_ANSWER     | ✅ Editable         |
| CODE            | 🚧 Placeholder only |
| NOTEBOOK        | 🚫 Placeholder only |
| READING_PASSAGE | 🚫 Placeholder only |
| FILE_UPLOAD     | 🚫 Placeholder only |
| RUBRIC_ONLY     | 🚫 Placeholder only |

## Backend API routes

```
POST   /workspace/assessments
GET    /workspace/assessments
GET    /workspace/assessments/:assessmentId
PATCH  /workspace/assessments/:assessmentId
PUT    /workspace/assessments/:assessmentId/content
POST   /workspace/assessments/:assessmentId/publish
POST   /workspace/assessments/:assessmentId/archive
POST   /workspace/assessments/:assessmentId/restore
GET    /workspace/assessments/:assessmentId/snapshots/latest
```
