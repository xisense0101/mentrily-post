import { describe, expect, it, vi } from 'vitest';
import type { PermissionEvaluator } from '@mentrily/service-core';
import { AssessmentAttemptRepository, AssessmentGradingRepository } from '../domain/repositories/index.js';
import { AssessmentAttempt, AssessmentResultReleasePolicyService } from '../domain/index.js';
import { GetInstructorAssessmentResultUseCase, GetLearnerAssessmentResultUseCase } from '../application/use-cases/index.js';
import { TEST_TENANT_ID, TEST_WORKSPACE_ID, createAssessmentRequestContext } from './assessment-test-fixtures.js';

function createPermissionEvaluator(allowed: boolean): PermissionEvaluator { return { evaluate: vi.fn(async () => ({ allowed })) }; }
function createAttempt() {
  const attempt = AssessmentAttempt.start({ id: 'attempt-1', tenantId: TEST_TENANT_ID, workspaceId: TEST_WORKSPACE_ID, assessmentId: 'assessment-1', snapshotId: 'snapshot-1', snapshotVersionId: 'version-1', snapshotVersionNumber: 1, learnerPrincipalId: 'learner-1', sessionId: 'session-1' });
  attempt.submit('result-1');
  attempt.result?.markGraded({ value: 1 } as never, { value: 1 } as never);
  attempt.releaseResult({ releasedAt: new Date('2026-01-01T00:00:00.000Z') });
  return attempt;
}

describe('assessment result read use cases', () => {
  it('learner can read own released result', async () => {
    const attempt = createAttempt();
    const useCase = new GetLearnerAssessmentResultUseCase({ findById: vi.fn(async () => attempt) } as unknown as AssessmentAttemptRepository, { findLatestRunByAttemptId: vi.fn(async () => null) } as unknown as AssessmentGradingRepository, new AssessmentResultReleasePolicyService(), createPermissionEvaluator(true));
    const response = await useCase.execute(createAssessmentRequestContext({ workspace: { tenantId: TEST_TENANT_ID, workspaceId: TEST_WORKSPACE_ID, actorId: 'learner-1' } }), attempt.id);
    expect(response.gradingStatus).toBe('RELEASED');
  });

  it('learner cannot read unreleased result or another learner result', async () => {
    const attempt = createAttempt();
    attempt.result?.clearRelease();
    attempt.result!.gradingStatus = 'GRADED';
    const useCase = new GetLearnerAssessmentResultUseCase({ findById: vi.fn(async () => attempt) } as unknown as AssessmentAttemptRepository, { findLatestRunByAttemptId: vi.fn(async () => null) } as unknown as AssessmentGradingRepository, new AssessmentResultReleasePolicyService(), createPermissionEvaluator(true));
    await expect(useCase.execute(createAssessmentRequestContext({ workspace: { tenantId: TEST_TENANT_ID, workspaceId: TEST_WORKSPACE_ID, actorId: 'learner-1' } }), attempt.id)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(useCase.execute(createAssessmentRequestContext({ workspace: { tenantId: TEST_TENANT_ID, workspaceId: TEST_WORKSPACE_ID, actorId: 'learner-2' } }), attempt.id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('instructor can read workspace result and cross-workspace fails', async () => {
    const attempt = createAttempt();
    const useCase = new GetInstructorAssessmentResultUseCase({ findById: vi.fn(async () => attempt) } as unknown as AssessmentAttemptRepository, { findLatestRunByAttemptId: vi.fn(async () => null) } as unknown as AssessmentGradingRepository, createPermissionEvaluator(true));
    await expect(useCase.execute(createAssessmentRequestContext(), attempt.id)).resolves.toMatchObject({ attemptId: attempt.id });
    await expect(useCase.execute(createAssessmentRequestContext({ workspace: { tenantId: TEST_TENANT_ID, workspaceId: 'workspace-2', actorId: 'teacher-1' } }), attempt.id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
