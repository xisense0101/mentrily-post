import { describe, expect, it } from 'vitest';
import {
  AssessmentAttempt,
  AssessmentAttemptPolicyService,
  AssessmentAttemptSubmissionPolicyService,
} from '../domain/index.js';

describe('Assessment attempt policies', () => {
  function createSubmittedAttempt() {
    const attempt = AssessmentAttempt.start({
      id: '20000000-0000-4000-8000-000000000001',
      tenantId: '20000000-0000-4000-8000-000000000002',
      workspaceId: '20000000-0000-4000-8000-000000000003',
      assessmentId: '20000000-0000-4000-8000-000000000004',
      snapshotId: '20000000-0000-4000-8000-000000000005',
      snapshotVersionId: '20000000-0000-4000-8000-000000000006',
      snapshotVersionNumber: 1,
      learnerPrincipalId: '20000000-0000-4000-8000-000000000007',
      sessionId: '20000000-0000-4000-8000-000000000008',
      startedAt: new Date('2026-05-17T11:00:00.000Z'),
    });
    attempt.submit('20000000-0000-4000-8000-000000000009');
    return attempt;
  }

  it('calculates expiresAt for timed attempts and leaves untimed attempts open', () => {
    const policy = new AssessmentAttemptPolicyService();
    const startedAt = new Date('2026-05-17T11:00:00.000Z');

    expect(policy.calculateExpiresAt({ startedAt, timeLimitMinutes: 45 })?.toISOString()).toBe(
      '2026-05-17T11:45:00.000Z',
    );
    expect(policy.calculateExpiresAt({ startedAt })).toBeUndefined();
  });

  it('enforces max attempts and no-retake policy after a submitted attempt', () => {
    const policy = new AssessmentAttemptPolicyService();
    const existingAttempts = [createSubmittedAttempt()];

    expect(
      policy.canStartAttempt({
        assessmentStatus: 'PUBLISHED',
        snapshotId: '20000000-0000-4000-8000-000000000005',
        existingAttempts,
        maxAttempts: 1,
        allowRetake: true,
      }),
    ).toMatchObject({ allowed: false });

    expect(
      policy.canStartAttempt({
        assessmentStatus: 'PUBLISHED',
        snapshotId: '20000000-0000-4000-8000-000000000005',
        existingAttempts,
        allowRetake: false,
      }),
    ).toMatchObject({ allowed: false });
  });

  it('blocks save and submit when an in-progress attempt is past expiry', () => {
    const policy = new AssessmentAttemptSubmissionPolicyService();
    const attempt = AssessmentAttempt.start({
      id: '20000000-0000-4000-8000-000000000011',
      tenantId: '20000000-0000-4000-8000-000000000012',
      workspaceId: '20000000-0000-4000-8000-000000000013',
      assessmentId: '20000000-0000-4000-8000-000000000014',
      snapshotId: '20000000-0000-4000-8000-000000000015',
      snapshotVersionId: '20000000-0000-4000-8000-000000000016',
      snapshotVersionNumber: 1,
      learnerPrincipalId: '20000000-0000-4000-8000-000000000017',
      sessionId: '20000000-0000-4000-8000-000000000018',
      startedAt: new Date('2026-05-17T11:00:00.000Z'),
      expiresAt: new Date('2026-05-17T11:30:00.000Z'),
    });

    const now = new Date('2026-05-17T11:30:00.000Z');

    expect(policy.canSaveAnswer(attempt, now)).toMatchObject({ allowed: false });
    expect(policy.canSubmit(attempt, now)).toMatchObject({ allowed: false });
  });
});
