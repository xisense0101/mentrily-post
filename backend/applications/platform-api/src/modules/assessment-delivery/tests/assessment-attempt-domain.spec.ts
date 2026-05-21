import { describe, expect, it } from 'vitest';
import {
  AssessmentAttempt,
  AssessmentAttemptScore,
  AssessmentAttemptSubmissionPolicyService,
} from '../domain/index.js';

describe('Assessment attempt domain', () => {
  function createAttempt() {
    return AssessmentAttempt.start({
      id: '10000000-0000-4000-8000-000000000001',
      tenantId: '10000000-0000-4000-8000-000000000002',
      workspaceId: '10000000-0000-4000-8000-000000000003',
      assessmentId: '10000000-0000-4000-8000-000000000004',
      snapshotId: '10000000-0000-4000-8000-000000000005',
      snapshotVersionId: '10000000-0000-4000-8000-000000000006',
      snapshotVersionNumber: 3,
      learnerPrincipalId: '10000000-0000-4000-8000-000000000007',
      sessionId: '10000000-0000-4000-8000-000000000008',
      expiresAt: new Date('2026-05-17T11:30:00.000Z'),
      startedAt: new Date('2026-05-17T11:00:00.000Z'),
    });
  }

  it('start creates an in-progress attempt that references a published snapshot', () => {
    const attempt = createAttempt();

    expect(attempt.status).toBe('IN_PROGRESS');
    expect(attempt.snapshotId).toBe('10000000-0000-4000-8000-000000000005');
    expect(attempt.snapshotVersionId).toBe('10000000-0000-4000-8000-000000000006');
    expect(attempt.snapshotVersionNumber).toBe(3);
    expect(attempt.session.attemptId).toBe(attempt.id);
  });

  it('saves answers only while in progress', () => {
    const attempt = createAttempt();

    const saved = attempt.saveAnswer({
      answerId: '10000000-0000-4000-8000-000000000009',
      questionId: '10000000-0000-4000-8000-000000000010',
      questionKind: 'MCQ',
      answer: { selectedOptionId: '10000000-0000-4000-8000-000000000011' },
    });

    expect(saved.status).toBe('DRAFT');
    expect(attempt.answers).toHaveLength(1);

    attempt.cancel();

    expect(() =>
      attempt.saveAnswer({
        answerId: '10000000-0000-4000-8000-000000000012',
        questionId: '10000000-0000-4000-8000-000000000013',
        questionKind: 'MCQ',
        answer: { selectedOptionId: '10000000-0000-4000-8000-000000000014' },
      }),
    ).toThrow('Cannot save answer');
  });

  it('submit marks all answers submitted and creates a result placeholder', () => {
    const attempt = createAttempt();
    attempt.saveAnswer({
      answerId: '10000000-0000-4000-8000-000000000009',
      questionId: '10000000-0000-4000-8000-000000000010',
      questionKind: 'SHORT_ANSWER',
      answer: { text: 'hello' },
    });

    const result = attempt.submit('10000000-0000-4000-8000-000000000015');

    expect(attempt.status).toBe('SUBMITTED');
    expect(attempt.submittedAt).toBeInstanceOf(Date);
    expect(attempt.answers.every((answer) => answer.status === 'SUBMITTED')).toBe(true);
    expect(result.gradingStatus).toBe('NOT_GRADED');
    expect(attempt.result?.id).toBe('10000000-0000-4000-8000-000000000015');
  });

  it('allows structural reading passage answers without forcing learner input', () => {
    const attempt = createAttempt();

    const saved = attempt.saveAnswer({
      answerId: '10000000-0000-4000-8000-000000000019',
      questionId: '10000000-0000-4000-8000-000000000020',
      questionKind: 'READING_PASSAGE',
      answer: {},
    });

    expect(saved.answer).toEqual({});
    expect(saved.status).toBe('DRAFT');
  });

  it('expired attempts cannot save or submit', () => {
    const attempt = createAttempt();
    const submissionPolicy = new AssessmentAttemptSubmissionPolicyService();

    attempt.expire();

    expect(submissionPolicy.canSaveAnswer(attempt).allowed).toBe(false);
    expect(submissionPolicy.canSubmit(attempt).allowed).toBe(false);
  });

  it('cancelled attempts cannot save or submit', () => {
    const attempt = createAttempt();
    const submissionPolicy = new AssessmentAttemptSubmissionPolicyService();

    attempt.cancel();

    expect(submissionPolicy.canSaveAnswer(attempt).allowed).toBe(false);
    expect(submissionPolicy.canSubmit(attempt).allowed).toBe(false);
  });

  it('does not release a result before it is graded', () => {
    const attempt = createAttempt();
    const result = attempt.submit('10000000-0000-4000-8000-000000000015');

    expect(() => result.release()).toThrow('Cannot release a result that is not graded');

    result.markGraded(AssessmentAttemptScore.create(8), AssessmentAttemptScore.create(10));
    result.release({ summary: 'Released' });

    expect(result.gradingStatus).toBe('RELEASED');
    expect(result.releasedAt).toBeInstanceOf(Date);
  });
});
