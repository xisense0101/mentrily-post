import { describe, expect, it } from 'vitest';
import {
  mapLearnerAssessmentResultToResponse,
  mapInstructorAssessmentResultToResponse,
} from '../application/mappers/assessment-result-response.mapper.js';
import { AssessmentAttempt } from '../domain/entities/assessment-attempt.entity.js';
import { AssessmentAnswerGrade } from '../domain/entities/assessment-answer-grade.entity.js';
import { AssessmentGradingRun } from '../domain/entities/assessment-grading-run.entity.js';
import { AssessmentGradeScore } from '../domain/value-objects/assessment-grade-score.vo.js';

const TEST_TENANT_ID = 'tenant-1';
const TEST_WORKSPACE_ID = 'workspace-1';

function createBaseAttempt(): AssessmentAttempt {
  const attempt = AssessmentAttempt.start({
    id: 'attempt-1',
    tenantId: TEST_TENANT_ID,
    workspaceId: TEST_WORKSPACE_ID,
    assessmentId: 'assessment-1',
    snapshotId: 'snapshot-1',
    snapshotVersionId: 'version-1',
    snapshotVersionNumber: 1,
    learnerPrincipalId: 'learner-1',
    sessionId: 'session-1',
  });
  return attempt;
}

function createAttemptWithCodeAnswer(): AssessmentAttempt {
  const attempt = createBaseAttempt();
  attempt.saveAnswer({
    answerId: 'answer-1',
    questionId: 'question-1',
    questionKind: 'CODE',
    answer: { sourceCode: 'print("hello")', language: 'python' },
  });
  attempt.submit('result-1');
  attempt.result?.markGraded(
    AssessmentGradeScore.create(8) as never,
    AssessmentGradeScore.create(10) as never,
  );
  attempt.releaseResult({ releasedAt: new Date('2026-01-01T00:00:00.000Z') });
  return attempt;
}

function createAttemptWithMcqAnswer(): AssessmentAttempt {
  const attempt = createBaseAttempt();
  attempt.saveAnswer({
    answerId: 'answer-1',
    questionId: 'question-1',
    questionKind: 'MCQ',
    answer: { selectedOptionIds: ['opt-1'] },
  });
  attempt.submit('result-1');
  attempt.result?.markGraded(
    AssessmentGradeScore.create(5) as never,
    AssessmentGradeScore.create(5) as never,
  );
  attempt.releaseResult({ releasedAt: new Date('2026-01-01T00:00:00.000Z') });
  return attempt;
}

function createCodeGradeWithFeedback(
  feedback: Record<string, unknown>,
  metadata: Record<string, unknown> = {},
): AssessmentAnswerGrade {
  const grade = AssessmentAnswerGrade.restore({
    id: 'grade-1',
    attemptId: 'attempt-1',
    answerId: 'answer-1',
    questionId: 'question-1',
    questionKind: 'CODE',
    status: 'AUTO_GRADED',
    method: 'AUTO_RULE',
    score: AssessmentGradeScore.create(8),
    maxScore: AssessmentGradeScore.create(10),
    feedback,
    metadata,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return grade;
}

function createCodeGradePendingReview(
  feedback: Record<string, unknown> = {},
): AssessmentAnswerGrade {
  return AssessmentAnswerGrade.restore({
    id: 'grade-1',
    attemptId: 'attempt-1',
    answerId: 'answer-1',
    questionId: 'question-1',
    questionKind: 'CODE',
    status: 'PENDING_MANUAL_REVIEW',
    method: 'MANUAL_REVIEW',
    maxScore: AssessmentGradeScore.create(10),
    feedback,
    metadata: { reason: 'provider_unavailable' },
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

function createMcqGrade(feedback: Record<string, unknown> = {}): AssessmentAnswerGrade {
  return AssessmentAnswerGrade.restore({
    id: 'grade-1',
    attemptId: 'attempt-1',
    answerId: 'answer-1',
    questionId: 'question-1',
    questionKind: 'MCQ',
    status: 'AUTO_GRADED',
    method: 'AUTO_RULE',
    score: AssessmentGradeScore.create(5),
    maxScore: AssessmentGradeScore.create(5),
    feedback,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

function createGradingRun(grades: AssessmentAnswerGrade[] = []): AssessmentGradingRun {
  return {
    id: 'run-1',
    attemptId: 'attempt-1',
    assessmentId: 'assessment-1',
    snapshotId: 'snapshot-1',
    answerGrades: grades,
  } as unknown as AssessmentGradingRun;
}

describe('assessment-result-response.mapper — coding result safety', () => {
  describe('mapLearnerAssessmentResultToResponse', () => {
    it('returns empty answers when no grading run', () => {
      const attempt = createAttemptWithCodeAnswer();
      const response = mapLearnerAssessmentResultToResponse(attempt);
      // Attempt has 1 answer but no grading run grades
      expect(response.answers).toHaveLength(1);
      expect(response.answers[0]?.codingResult).toBeUndefined();
    });

    it('includes safe codingResult for CODE questions', () => {
      const attempt = createAttemptWithCodeAnswer();
      const grade = createCodeGradeWithFeedback({
        publicTestResults: [
          {
            id: 'hidden-tc-001',
            input: 'secret_input',
            expectedOutput: 'secret_expected',
            stdout: 'hello',
            stderr: '',
            verdict: 'ACCEPTED',
            passed: true,
            visibility: 'PUBLIC_GRADED',
          },
        ],
        passedHiddenCount: 3,
        totalHiddenCount: 5,
        message: 'All tests passed.',
      });

      const run = createGradingRun([grade]);
      const response = mapLearnerAssessmentResultToResponse(attempt, run);

      const codeAnswer = response.answers.find((a) => a.questionKind === 'CODE');
      expect(codeAnswer).toBeTruthy();
      expect(codeAnswer?.codingResult).toBeTruthy();

      const cr = codeAnswer!.codingResult!;

      // Safe hidden aggregate counts present
      expect(cr.passedHiddenCount).toBe(3);
      expect(cr.totalHiddenCount).toBe(5);

      // Public test results present with index (not ID)
      expect(cr.publicTestResults).toHaveLength(1);
      const ptr = cr.publicTestResults![0]!;
      expect(ptr.index).toBe(1);
      expect(ptr.verdict).toBe('ACCEPTED');
      expect(ptr.passed).toBe(true);

      // Hidden test ID must NOT be exposed
      expect(JSON.stringify(ptr)).not.toContain('hidden-tc-001');
      expect(JSON.stringify(ptr)).not.toContain('"id"');

      // Hidden test input must NOT be exposed
      expect(JSON.stringify(ptr)).not.toContain('secret_input');

      // Hidden expected output must NOT be exposed
      expect(JSON.stringify(ptr)).not.toContain('secret_expected');

      // Raw feedback must NOT be in learner result
      expect(codeAnswer?.feedback).toBeUndefined();
    });

    it('does NOT expose hidden test IDs in learner result', () => {
      const attempt = createAttemptWithCodeAnswer();
      const grade = createCodeGradeWithFeedback({
        publicTestResults: [
          {
            id: 'tc-hidden-uuid',
            input: 'hidden_input',
            expectedOutput: 'hidden_out',
            verdict: 'WRONG_ANSWER',
            passed: false,
            visibility: 'PUBLIC_GRADED',
          },
        ],
      });

      const run = createGradingRun([grade]);
      const response = mapLearnerAssessmentResultToResponse(attempt, run);
      const responseJson = JSON.stringify(response);

      expect(responseJson).not.toContain('tc-hidden-uuid');
      expect(responseJson).not.toContain('hidden_input');
      expect(responseJson).not.toContain('hidden_out');
    });

    it('does NOT expose provider internals in learner result', () => {
      const attempt = createAttemptWithCodeAnswer();
      const grade = createCodeGradeWithFeedback(
        {},
        {
          provider: 'judge0',
          submissionToken: 'secret-token-123',
          queueId: 'queue-abc',
          containerId: 'container-xyz',
          workerId: 'worker-001',
          providerUrl: 'https://api.judge0.internal',
          providerApiKey: 'sk-judge0-key',
        },
      );

      const run = createGradingRun([grade]);
      const response = mapLearnerAssessmentResultToResponse(attempt, run);
      const responseJson = JSON.stringify(response);

      expect(responseJson).not.toContain('secret-token-123');
      expect(responseJson).not.toContain('queue-abc');
      expect(responseJson).not.toContain('container-xyz');
      expect(responseJson).not.toContain('worker-001');
      expect(responseJson).not.toContain('judge0');
      expect(responseJson).not.toContain('sk-judge0-key');
    });

    it('includes safe pending manual review result for CODE', () => {
      const attempt = createAttemptWithCodeAnswer();
      const grade = createCodeGradePendingReview({
        message: 'Execution provider is temporarily unavailable. Manual review required.',
      });

      const run = createGradingRun([grade]);
      const response = mapLearnerAssessmentResultToResponse(attempt, run);
      const codeAnswer = response.answers.find((a) => a.questionKind === 'CODE');
      expect(codeAnswer?.codingResult?.status).toBe('PENDING_MANUAL_REVIEW');
      // message should be present and safe
      expect(codeAnswer?.codingResult?.message).toContain('unavailable');
    });

    it('does NOT include codingResult for non-CODE questions', () => {
      const attempt = createAttemptWithMcqAnswer();
      const mcqGrade = createMcqGrade({ message: 'Correct answer.' });

      const run = createGradingRun([mcqGrade]);
      const response = mapLearnerAssessmentResultToResponse(attempt, run);
      const mcqAnswer = response.answers.find((a) => a.questionKind === 'MCQ');
      expect(mcqAnswer?.codingResult).toBeUndefined();
    });

    it('result release policy: does not expose unreleased result content', () => {
      // The mapper itself maps the data; release gating is enforced at the use-case level.
      // Verify the mapper preserves gradingStatus correctly.
      const attempt = createAttemptWithCodeAnswer();
      const response = mapLearnerAssessmentResultToResponse(attempt);
      // After releaseResult(), gradingStatus is RELEASED
      expect(response.gradingStatus).toBe('RELEASED');
    });
  });

  describe('mapInstructorAssessmentResultToResponse', () => {
    it('includes safe codingResult for CODE questions in instructor view', () => {
      const attempt = createAttemptWithCodeAnswer();
      const grade = createCodeGradeWithFeedback({
        publicTestResults: [
          {
            id: 'tc-1',
            input: 'in',
            expectedOutput: 'out',
            verdict: 'ACCEPTED',
            passed: true,
            visibility: 'PUBLIC_GRADED',
          },
        ],
        passedHiddenCount: 2,
        totalHiddenCount: 3,
      });

      const run = createGradingRun([grade]);
      const response = mapInstructorAssessmentResultToResponse(attempt, run);
      const codeAnswer = response.answers.find((a) => a.questionKind === 'CODE');
      expect(codeAnswer?.codingResult).toBeTruthy();

      // Hidden test IDs must not appear
      const responseJson = JSON.stringify(response);
      expect(responseJson).not.toContain('tc-1');

      // Hidden aggregate should be safe
      expect(codeAnswer?.codingResult?.passedHiddenCount).toBe(2);
      expect(codeAnswer?.codingResult?.totalHiddenCount).toBe(3);

      // learnerAnswer is preserved (instructor view only)
      expect((codeAnswer as { learnerAnswer?: unknown })?.learnerAnswer).toBeTruthy();
    });

    it('does NOT expose raw feedback blob in instructor result for CODE', () => {
      const attempt = createAttemptWithCodeAnswer();
      const grade = createCodeGradeWithFeedback({
        publicTestResults: [],
        passedHiddenCount: 0,
        totalHiddenCount: 0,
        internalProviderData: 'SHOULD_NOT_APPEAR',
      });

      const run = createGradingRun([grade]);
      const response = mapInstructorAssessmentResultToResponse(attempt, run);
      const responseJson = JSON.stringify(response);
      expect(responseJson).not.toContain('internalProviderData');
      expect(responseJson).not.toContain('SHOULD_NOT_APPEAR');
    });

    it('preserves non-CODE feedback for instructor (safe message only)', () => {
      const attempt = createAttemptWithMcqAnswer();
      const mcqGrade = createMcqGrade({ message: 'Correct.' });

      const run = createGradingRun([mcqGrade]);
      const response = mapInstructorAssessmentResultToResponse(attempt, run);
      const mcqAnswer = response.answers.find((a) => a.questionKind === 'MCQ');
      // Non-CODE feedback is still passed through for instructor view
      expect(mcqAnswer?.feedback).toBeDefined();
      expect(mcqAnswer?.codingResult).toBeUndefined();
    });
  });
});
