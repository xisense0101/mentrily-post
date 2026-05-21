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
    return {
      questionId: answer.questionId,
      questionKind: answer.questionKind,
      ...(grade?.score !== undefined ? { score: grade.score.value } : {}),
      ...(grade !== undefined ? { maxScore: grade.maxScore.value } : {}),
      ...(grade?.feedback !== undefined ? { feedback: { ...grade.feedback } } : {}),
      answerStatus: answer.status,
    };
  });
}

function mapInstructorAnswerResult(
  attempt: AssessmentAttempt,
  gradeByQuestionId: Map<string, AssessmentAnswerGrade>,
): AssessmentInstructorAnswerResultResponse[] {
  return attempt.answers.map((answer) => {
    const grade = gradeByQuestionId.get(answer.questionId);
    return {
      answerId: answer.id,
      questionId: answer.questionId,
      questionKind: answer.questionKind,
      learnerAnswer: { ...answer.answer },
      ...(grade?.id !== undefined ? { answerGradeId: grade.id } : {}),
      ...(grade?.score !== undefined ? { score: grade.score.value } : {}),
      ...(grade !== undefined ? { maxScore: grade.maxScore.value } : {}),
      ...(grade?.feedback !== undefined ? { feedback: { ...grade.feedback } } : {}),
      ...(grade?.method !== undefined ? { gradingMethod: grade.method } : {}),
      ...(grade?.gradedAt !== undefined ? { gradedAt: grade.gradedAt.toISOString() } : {}),
      ...(grade?.gradedByPrincipalId !== undefined
        ? { gradedByPrincipalId: grade.gradedByPrincipalId }
        : {}),
      answerStatus: answer.status,
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
    ...(attempt.result?.feedback !== undefined ? { feedback: { ...attempt.result.feedback } } : {}),
    answers: mapInstructorAnswerResult(attempt, gradeByQuestionId),
  };
}
