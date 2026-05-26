import { describe, expect, it, vi } from 'vitest';
import type { PermissionEvaluator } from '@mentrily/service-core';
import {
  AssessmentPublishedSnapshot,
  AssessmentQuestion,
  AssessmentSnapshotRepository,
  AssessmentAttempt,
  AssessmentAttemptRepository,
  AssessmentSection,
  GradingModeEnum,
  QuestionOption,
  QuestionPoints,
} from '../domain/index.js';
import { GetAssessmentAttemptSnapshotUseCase } from '../application/use-cases/index.js';
import {
  TEST_ACTOR_ID,
  TEST_TENANT_ID,
  TEST_WORKSPACE_ID,
  createAssessmentRequestContext,
} from './assessment-test-fixtures.js';

function createPermissionEvaluator(allowed: boolean): PermissionEvaluator {
  return { evaluate: vi.fn(async () => ({ allowed })) };
}

function createSnapshot() {
  const question = AssessmentQuestion.create({
    id: '51000000-0000-4000-8000-000000000001',
    assessmentId: '51000000-0000-4000-8000-000000000002',
    sectionId: '51000000-0000-4000-8000-000000000010',
    kind: 'MCQ',
    title: 'Snapshot MCQ',
    prompt: { text: 'Choose one answer.' },
    options: [
      QuestionOption.create({
        id: '51000000-0000-4000-8000-000000000003',
        label: 'Option A',
        value: 'A',
        isCorrect: true,
      }),
      QuestionOption.create({
        id: '51000000-0000-4000-8000-000000000008',
        label: 'Option B',
        value: 'B',
        isCorrect: false,
      }),
    ],
    points: QuestionPoints.create(1),
    gradingMode: GradingModeEnum.AUTO,
    position: 0,
    metadata: {},
  });
  const section = AssessmentSection.create({
    id: '51000000-0000-4000-8000-000000000010',
    assessmentId: '51000000-0000-4000-8000-000000000002',
    title: 'Published section',
    position: 0,
    questions: [question],
    metadata: {},
  });

  return AssessmentPublishedSnapshot.restore({
    id: '51000000-0000-4000-8000-000000000004',
    assessmentId: '51000000-0000-4000-8000-000000000002',
    versionId: '51000000-0000-4000-8000-000000000005',
    versionNumber: 1,
    sections: [section],
    looseQuestions: [],
    publishedByPrincipalId: TEST_ACTOR_ID,
    publishedAt: new Date('2026-05-17T12:00:00.000Z'),
    createdAt: new Date('2026-05-17T12:00:00.000Z'),
  });
}

function createAttempt(snapshotId: string) {
  return AssessmentAttempt.start({
    id: '51000000-0000-4000-8000-000000000006',
    tenantId: TEST_TENANT_ID,
    workspaceId: TEST_WORKSPACE_ID,
    assessmentId: '51000000-0000-4000-8000-000000000002',
    snapshotId,
    snapshotVersionId: '51000000-0000-4000-8000-000000000005',
    snapshotVersionNumber: 1,
    learnerPrincipalId: TEST_ACTOR_ID,
    sessionId: '51000000-0000-4000-8000-000000000007',
    startedAt: new Date('2026-05-17T12:10:00.000Z'),
    metadata: {},
  });
}

describe('GetAssessmentAttemptSnapshotUseCase', () => {
  it('returns the published snapshot for the learner-owned attempt', async () => {
    const snapshot = createSnapshot();
    const attempt = createAttempt(snapshot.id);
    const useCase = new GetAssessmentAttemptSnapshotUseCase(
      {
        findById: vi.fn(async () => attempt),
        save: vi.fn(async (savedAttempt) => savedAttempt),
      } as unknown as AssessmentAttemptRepository,
      { findById: vi.fn(async () => snapshot) } as unknown as AssessmentSnapshotRepository,
      createPermissionEvaluator(true),
    );

    const response = await useCase.execute(createAssessmentRequestContext(), attempt.id);

    expect(response.id).toBe(snapshot.id);
    expect(response.sections).toHaveLength(1);
    expect(response.sections[0]?.questions[0]?.title).toBe('Snapshot MCQ');
  });

  it('rejects reads for another learner attempt', async () => {
    const snapshot = createSnapshot();
    const attempt = AssessmentAttempt.start({
      id: '51000000-0000-4000-8000-000000000106',
      tenantId: TEST_TENANT_ID,
      workspaceId: TEST_WORKSPACE_ID,
      assessmentId: snapshot.assessmentId,
      snapshotId: snapshot.id,
      snapshotVersionId: snapshot.versionId,
      snapshotVersionNumber: snapshot.versionNumber,
      learnerPrincipalId: 'other-learner',
      sessionId: '51000000-0000-4000-8000-000000000107',
      startedAt: new Date('2026-05-17T12:10:00.000Z'),
      metadata: {},
    });
    const useCase = new GetAssessmentAttemptSnapshotUseCase(
      {
        findById: vi.fn(async () => attempt),
        save: vi.fn(async (savedAttempt) => savedAttempt),
      } as unknown as AssessmentAttemptRepository,
      { findById: vi.fn(async () => snapshot) } as unknown as AssessmentSnapshotRepository,
      createPermissionEvaluator(true),
    );

    await expect(
      useCase.execute(createAssessmentRequestContext(), attempt.id),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('rejects cross-workspace access', async () => {
    const snapshot = createSnapshot();
    const attempt = AssessmentAttempt.start({
      id: '51000000-0000-4000-8000-000000000206',
      tenantId: TEST_TENANT_ID,
      workspaceId: 'other-workspace',
      assessmentId: snapshot.assessmentId,
      snapshotId: snapshot.id,
      snapshotVersionId: snapshot.versionId,
      snapshotVersionNumber: snapshot.versionNumber,
      learnerPrincipalId: TEST_ACTOR_ID,
      sessionId: '51000000-0000-4000-8000-000000000207',
      startedAt: new Date('2026-05-17T12:10:00.000Z'),
      metadata: {},
    });
    const useCase = new GetAssessmentAttemptSnapshotUseCase(
      {
        findById: vi.fn(async () => attempt),
        save: vi.fn(async (savedAttempt) => savedAttempt),
      } as unknown as AssessmentAttemptRepository,
      { findById: vi.fn(async () => snapshot) } as unknown as AssessmentSnapshotRepository,
      createPermissionEvaluator(true),
    );

    await expect(
      useCase.execute(createAssessmentRequestContext(), attempt.id),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('fails without request context workspace actor', async () => {
    const snapshot = createSnapshot();
    const attempt = createAttempt(snapshot.id);
    const useCase = new GetAssessmentAttemptSnapshotUseCase(
      {
        findById: vi.fn(async () => attempt),
        save: vi.fn(async (savedAttempt) => savedAttempt),
      } as unknown as AssessmentAttemptRepository,
      { findById: vi.fn(async () => snapshot) } as unknown as AssessmentSnapshotRepository,
      createPermissionEvaluator(true),
    );

    await expect(
      useCase.execute(
        { requestId: 'req', correlationId: 'cor', timestamp: new Date().toISOString() },
        attempt.id,
      ),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });
});
