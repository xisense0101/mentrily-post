import {
  AssessmentAttempt,
  AssessmentAnswerGrade,
  AssessmentGradingRun,
} from '../../domain/entities/index.js';
import type {
  AssessmentAnswerResultResponse,
  AssessmentInstructorAnswerResultResponse,
  AssessmentInstructorResultResponse,
  AssessmentLearnerResultResponse,
  AssessmentResultSummaryResponse,
} from '../dto/index.js';
import type {
  CodingGradeStatusContract,
  CodingPublicTestResultContract,
  CodingResultSummaryContract,
  CodingVerdictContract,
} from '@mentrily/contract-catalog';

/** Allowlisted verdict values from the coding grader. Never includes provider internals. */
const SAFE_VERDICTS: ReadonlySet<string> = new Set([
  'ACCEPTED',
  'WRONG_ANSWER',
  'COMPILE_ERROR',
  'RUNTIME_ERROR',
  'TIME_LIMIT_EXCEEDED',
  'MEMORY_LIMIT_EXCEEDED',
  'OUTPUT_LIMIT_EXCEEDED',
  'PROVIDER_UNAVAILABLE',
  'VALIDATION_ERROR',
]);

/** Allowlisted grade statuses for the coding result summary. */
const SAFE_GRADE_STATUSES: ReadonlySet<string> = new Set([
  'AUTO_GRADED',
  'PENDING_MANUAL_REVIEW',
  'MANUALLY_GRADED',
  'GRADING_FAILED',
]);

function toSafeVerdict(raw: unknown): CodingVerdictContract | undefined {
  if (typeof raw === 'string' && SAFE_VERDICTS.has(raw)) {
    return raw as CodingVerdictContract;
  }
  return undefined;
}

function toSafeGradeStatus(raw: unknown): CodingGradeStatusContract {
  if (typeof raw === 'string' && SAFE_GRADE_STATUSES.has(raw)) {
    return raw as CodingGradeStatusContract;
  }
  return 'GRADING_FAILED';
}

function toSafeMessage(raw: unknown): string | undefined {
  if (typeof raw === 'string' && raw.length > 0 && raw.length <= 500) {
    return raw;
  }
  return undefined;
}

function toSafeOutput(raw: unknown): string | undefined {
  if (typeof raw === 'string') {
    // Cap at 4096 chars for safety
    return raw.length > 4096 ? raw.slice(0, 4096) + '\n[output truncated]' : raw;
  }
  return undefined;
}

/**
 * Extracts a safe, allowlisted coding result summary from grade feedback.
 *
 * Rules enforced here:
 * - hidden test IDs are never included
 * - hidden test input/expectedOutput are never included
 * - hidden test stdout/stderr are never included
 * - provider internals are never included
 * - raw metadata is never included
 * - only integer counts for hidden tests
 * - public results get an index-only identifier (1-based), no ID
 */
function extractSafeCodingResult(
  grade: AssessmentAnswerGrade,
): CodingResultSummaryContract | undefined {
  if (grade.questionKind !== 'CODE') {
    return undefined;
  }

  const scoreAwarded = grade.score?.value ?? 0;
  const maxScore = grade.maxScore.value;
  const status = toSafeGradeStatus(grade.status);

  const feedback = grade.feedback as Record<string, unknown> | undefined;

  // Extract verdict from feedback metadata if present
  const rawVerdict = feedback?.verdict ?? grade.metadata?.verdict;
  const verdict = toSafeVerdict(rawVerdict);

  // Extract safe message (user-facing only)
  const rawMessage = feedback?.message;
  const message = toSafeMessage(rawMessage);

  // Extract public test results — strip hidden tests, strip IDs, strip expectedOutput
  const rawPublic = feedback?.publicTestResults;
  let publicTestResults: CodingPublicTestResultContract[] | undefined;
  if (Array.isArray(rawPublic) && rawPublic.length > 0) {
    publicTestResults = rawPublic
      .filter((tr): tr is Record<string, unknown> => tr !== null && typeof tr === 'object')
      .map((tr, idx): CodingPublicTestResultContract => {
        const trVerdict = toSafeVerdict(tr.verdict) ?? 'VALIDATION_ERROR';
        const passed = tr.passed === true;
        return {
          index: idx + 1, // 1-based display index; ID is never exposed
          verdict: trVerdict,
          passed,
          // stdout/stderr are safe for public test results
          ...(toSafeOutput(tr.stdout) !== undefined ? { stdout: toSafeOutput(tr.stdout) } : {}),
          ...(toSafeOutput(tr.stderr) !== undefined ? { stderr: toSafeOutput(tr.stderr) } : {}),
          // input, expectedOutput, id are intentionally excluded
        };
      });
  }

  // Extract hidden aggregate counts (integers only — never expose details)
  const rawPassedHidden = feedback?.passedHiddenCount;
  const rawTotalHidden = feedback?.totalHiddenCount;
  const passedHiddenCount =
    typeof rawPassedHidden === 'number' && Number.isInteger(rawPassedHidden)
      ? rawPassedHidden
      : undefined;
  const totalHiddenCount =
    typeof rawTotalHidden === 'number' && Number.isInteger(rawTotalHidden)
      ? rawTotalHidden
      : undefined;

  return {
    scoreAwarded,
    maxScore,
    status,
    ...(verdict !== undefined ? { verdict } : {}),
    ...(publicTestResults !== undefined && publicTestResults.length > 0
      ? { publicTestResults }
      : {}),
    ...(passedHiddenCount !== undefined ? { passedHiddenCount } : {}),
    ...(totalHiddenCount !== undefined ? { totalHiddenCount } : {}),
    ...(message !== undefined ? { message } : {}),
  };
}

function mapSummary(attempt: AssessmentAttempt): AssessmentResultSummaryResponse {
  const result = attempt.result;
  if (!result) {
    throw new Error('Attempt result is required');
  }

  return {
    attemptId: attempt.id,
    assessmentId: attempt.assessmentId,
    snapshotId: attempt.snapshotId,
    learnerPrincipalId: attempt.learnerPrincipalId,
    status: attempt.status,
    gradingStatus: result.gradingStatus,
    ...(result.score !== undefined ? { score: result.score.value } : {}),
    ...(result.maxScore !== undefined ? { maxScore: result.maxScore.value } : {}),
    ...(result.releasedAt !== undefined ? { releasedAt: result.releasedAt.toISOString() } : {}),
    ...(attempt.submittedAt !== undefined
      ? { submittedAt: attempt.submittedAt.toISOString() }
      : {}),
  };
}

function mapLearnerAnswerResult(
  attempt: AssessmentAttempt,
  gradeByQuestionId: Map<string, AssessmentAnswerGrade>,
): AssessmentAnswerResultResponse[] {
  return attempt.answers.map((answer) => {
    const grade = gradeByQuestionId.get(answer.questionId);
    const codingResult = grade ? extractSafeCodingResult(grade) : undefined;
    return {
      questionId: answer.questionId,
      questionKind: answer.questionKind,
      ...(grade?.score !== undefined ? { score: grade.score.value } : {}),
      ...(grade !== undefined ? { maxScore: grade.maxScore.value } : {}),
      // feedback is intentionally omitted from learner result to prevent raw blob exposure
      answerStatus: answer.status,
      ...(codingResult !== undefined ? { codingResult } : {}),
    };
  });
}

function mapInstructorAnswerResult(
  attempt: AssessmentAttempt,
  gradeByQuestionId: Map<string, AssessmentAnswerGrade>,
): AssessmentInstructorAnswerResultResponse[] {
  return attempt.answers.map((answer) => {
    const grade = gradeByQuestionId.get(answer.questionId);
    const codingResult = grade ? extractSafeCodingResult(grade) : undefined;
    return {
      answerId: answer.id,
      questionId: answer.questionId,
      questionKind: answer.questionKind,
      learnerAnswer: { ...answer.answer },
      ...(grade?.id !== undefined ? { answerGradeId: grade.id } : {}),
      ...(grade?.score !== undefined ? { score: grade.score.value } : {}),
      ...(grade !== undefined ? { maxScore: grade.maxScore.value } : {}),
      // For CODE questions, feedback is replaced by codingResult; for others, include feedback
      ...(answer.questionKind !== 'CODE' && grade?.feedback !== undefined
        ? { feedback: { ...grade.feedback } }
        : {}),
      ...(grade?.method !== undefined ? { gradingMethod: grade.method } : {}),
      ...(grade?.gradedAt !== undefined ? { gradedAt: grade.gradedAt.toISOString() } : {}),
      ...(grade?.gradedByPrincipalId !== undefined
        ? { gradedByPrincipalId: grade.gradedByPrincipalId }
        : {}),
      answerStatus: answer.status,
      ...(codingResult !== undefined ? { codingResult } : {}),
    };
  });
}

export function mapLearnerAssessmentResultToResponse(
  attempt: AssessmentAttempt,
  gradingRun?: AssessmentGradingRun,
): AssessmentLearnerResultResponse {
  const gradeByQuestionId = new Map(
    (gradingRun?.answerGrades ?? []).map((grade) => [grade.questionId, grade]),
  );
  return {
    ...mapSummary(attempt),
    answers: mapLearnerAnswerResult(attempt, gradeByQuestionId),
  };
}

export function mapInstructorAssessmentResultToResponse(
  attempt: AssessmentAttempt,
  gradingRun?: AssessmentGradingRun,
): AssessmentInstructorResultResponse {
  const gradeByQuestionId = new Map(
    (gradingRun?.answerGrades ?? []).map((grade) => [grade.questionId, grade]),
  );
  return {
    ...mapSummary(attempt),
    ...(gradingRun?.id !== undefined ? { gradingRunId: gradingRun.id } : {}),
    // Intentionally omit result.feedback to prevent hidden metadata blob exposure
    answers: mapInstructorAnswerResult(attempt, gradeByQuestionId),
  };
}
