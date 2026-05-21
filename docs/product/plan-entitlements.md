# Plan Entitlements

## Plans

### Free
- Personal account only.
- No automatic workspace creation at signup.
- Principal-scoped entitlement subject (`{ kind: 'principal', principalId }`).
- **Limits**:
  - 2 Courses total.
  - 2 Exams per month.
  - Up to 50 Learners total.
- **Features**:
  - Basic question types only: MCQ, multi-select, reading.
  - No team features.

### Starter
- Workspace-backed.
- Workspace-scoped entitlement subject (`{ kind: 'workspace', workspaceId }`).
- **Seats**:

## Media Library note

- 012A adds backend media metadata and signed URL foundations only.
- No plan-specific media quotas or processing entitlements are enforced yet.
  - 2 admin seats.
  - 3 creator/teacher seats.
- **Limits**:
  - 15 Courses total.
  - 10 Exams per month.
  - Up to 200 Learners total.
- **Features**:
  - All question types.
  - No white-labeling.

### Pro
- Workspace-backed.
- Workspace-scoped entitlement subject (`{ kind: 'workspace', workspaceId }`).
- **Seats**:
  - 5 admin seats.
  - 10 creator/teacher seats.
- **Limits**:
  - 30 Courses total.
  - 20 Exams per month.
  - Up to 1000 Learners total.
- **Features**:
  - All question types.
  - No white-labeling.

### Enterprise
- Workspace-backed.
- Workspace-scoped entitlement subject (`{ kind: 'workspace', workspaceId }`).
- **Usage**: Unlimited or contract-governed usage.
- **Features**:
  - All question types.
  - Custom domains.
  - White-labeling and branding controls.
  - Enterprise management.
  - SSO/SCIM through provider adapters.

## Entitlement Examples

Domain modules must use the `EntitlementEvaluator` port to check for feature access. Examples:

Every entitlement evaluation input must include an explicit `subject`. There is no implicit workspace fallback in the contract.

Current implementation truth:
- Content Studio backend APIs enforce permissions for read/write operations.
- Assessment Builder authoring domain, persistence/API, and frontend shell now exist.
- Assessment attempt runtime backend foundation exists and learner attempt frontend now exists.
- Grading runtime foundation now exists for workspace-owner/admin/creator roles through backend permissions `assessment.grading.run`, `assessment.grading.read`, `assessment.grading.manual_review`, and `assessment.grading.pending_review.read`.
- Learner routes remain permission-driven, must not send `tenantId` or `workspaceId` in request bodies, and must use learner-owned published snapshots only.
- Code execution, notebook execution, AI grading, and proctoring entitlements remain future work.
- Result release permissions now exist.
- Execution runtime now has reserved/internal permissions plus a safe noop default provider and a fixture-only test provider. There is still no production execution entitlement surface and no learner execution endpoint.
- Plan-level assessment/exam entitlements are planned but not enforced in 010A.
- Audit and outbox persistence still occur on every mutating flow regardless of plan.

## Assessment and Exam entitlements (current and future)

- Number of assessments/exams per workspace or month.
- Number of learner attempts per assessment is now modeled in attempt policy and enforced by backend runtime rules.
- Question type availability (e.g., code/notebook questions only in Pro/Enterprise).
- Proctoring availability (future, Enterprise only).
- AI generation availability (future, Pro/Enterprise).
- Assessment grading worker priority or SLA remains future, because 011C adds synchronous backend grading foundation only and does not add a worker runtime.

```typescript
// Course Module
const result = await entitlementEvaluator.evaluate({
  entitlementKey: 'courses.limit',
  subject: { kind: 'workspace', workspaceId: context.workspace!.workspaceId }
}, context);

if (!result.enabled) {
  throw new EntitlementError('Course limit reached for your plan.');
}

// Branding Module
const brandingResult = await entitlementEvaluator.evaluate({
  entitlementKey: 'white_label.enabled',
  subject: { kind: 'workspace', workspaceId: context.workspace!.workspaceId }
}, context);

if (!brandingResult.enabled) {
  // Gracefully degrade: use default branding
}

// Personal Free creator without workspace
const personalResult = await entitlementEvaluator.evaluate({
  entitlementKey: 'courses.limit',
  subject: { kind: 'principal', principalId: principalId }
}, context);
```

## Implementation philosophy

- Entitlements are policy/config-driven, not hardcoded in random services.
- Domain modules consume entitlement ports, not plan names directly.
- Plan resolution occurs in commercial/identity boundaries and is exposed via typed contracts.
- UI and API must degrade gracefully when entitlements are absent.

## Task 011D Update (2026-05-18)
- Manual grading UI now exists for creator/admin review.
- Creator/admin can view pending manual-review answers, open grading runs, and submit manual score + feedback.
- Learner result page is not implemented yet.
- Result release workflow is not implemented yet.
- Code execution grading, notebook execution grading, AI grading, and proctoring are not implemented yet.
- Learning Delivery is not connected to Assessment grading.
- Content Studio is not connected to Assessment grading.
- Grading E2E uses real frontend + real backend + test Postgres.


## Assessment Results

Assessment result release depends on workspace-scoped assessment permissions. This workflow does not add code execution, notebook execution, AI grading, proctoring, Learning Delivery linkage, or Content Studio linkage.

## Task 011H Update (2026-05-19)

- Assessment reliability changes do not introduce new entitlement dimensions.
- Retry/idempotency behavior is product-wide safety, not a paid-plan feature.
- Media Library and future execution-provider work remain separate follow-on roadmap items.

## Task 011I Update (2026-05-20)

- Assessment UX hardening and question-type expansion do not add new entitlement dimensions yet.
- `READING_PASSAGE` and `FILE_UPLOAD` placeholder support are part of the baseline assessment surface.
- Real Media Library uploads, storage-backed asset limits, and execution-provider capabilities remain future entitlement questions.
## Task 012B Update (2026-05-21)

- Media Library frontend actions assume backend permission and entitlement checks remain authoritative.
- The portal does not trust tenant/workspace identifiers from request bodies for Media Library actions.
- Media management visibility remains permission-gated and private assets still require signed access checks.

## Communication Center

- Communication Center actions remain permission-gated and workspace-scoped.
- The system does not trust tenant or workspace identifiers from Communication Center request bodies.
- No plan-specific real provider entitlement is needed yet because delivery remains noop/fixture-only in 012C.
- 012D does not add inbox, preferences, campaign, or real-provider entitlement surfaces; scheduler processing remains backend-internal only.
- Task 012E does not introduce plan-based live-provider entitlements.
- Communication provider activation is configuration-gated, not plan-gated or user-facing.
