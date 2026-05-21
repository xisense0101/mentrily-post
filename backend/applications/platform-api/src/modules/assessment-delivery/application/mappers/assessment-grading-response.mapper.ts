import { AssessmentAnswerGrade, AssessmentGradingRun } from '../../domain/entities/index.js';
import {
  AssessmentAnswerGradeResponse,
  AssessmentManualReviewItemResponse,
  AssessmentGradingRunResponse,
} from '../dto/index.js';

export function mapAssessmentAnswerGradeToResponse(
  grade: AssessmentAnswerGrade,
): AssessmentAnswerGradeResponse {
  return {
    id: grade.id,
    attemptId: grade.attemptId,
    answerId: grade.answerId,
    questionId: grade.questionId,
    questionKind: grade.questionKind,
    status: grade.status,
    method: grade.method,
    ...(grade.score !== undefined ? { score: grade.score.value } : {}),
    maxScore: grade.maxScore.value,
    ...(grade.feedback !== undefined ? { feedback: { ...grade.feedback } } : {}),
    ...(grade.gradedByPrincipalId !== undefined
      ? { gradedByPrincipalId: grade.gradedByPrincipalId }
      : {}),
    ...(grade.gradedAt !== undefined ? { gradedAt: grade.gradedAt.toISOString() } : {}),
    metadata: { ...grade.metadata },
    createdAt: grade.createdAt.toISOString(),
    updatedAt: grade.updatedAt.toISOString(),
  };
}

export function mapAssessmentGradingRunToResponse(
  run: AssessmentGradingRun,
): AssessmentGradingRunResponse {
  return {
    id: run.id,
    attemptId: run.attemptId,
    assessmentId: run.assessmentId,
    snapshotId: run.snapshotId,
    status: run.status,
    ...(run.totalScore !== undefined ? { totalScore: run.totalScore.value } : {}),
    ...(run.maxScore !== undefined ? { maxScore: run.maxScore.value } : {}),
    answerGrades: run.answerGrades.map(mapAssessmentAnswerGradeToResponse),
    hasPendingManualReview: run.answerGrades.some(
      (grade) => grade.status === 'PENDING_MANUAL_REVIEW',
    ),
    startedAt: run.startedAt.toISOString(),
    ...(run.completedAt !== undefined ? { completedAt: run.completedAt.toISOString() } : {}),
    ...(run.failedAt !== undefined ? { failedAt: run.failedAt.toISOString() } : {}),
    ...(run.error !== undefined ? { error: run.error } : {}),
    createdAt: run.createdAt.toISOString(),
    updatedAt: run.updatedAt.toISOString(),
  };
}

export function mapAssessmentManualReviewItemToResponse(
  item: AssessmentManualReviewItemResponse,
): AssessmentManualReviewItemResponse {
  return {
    ...item,
    learnerAnswer: { ...item.learnerAnswer },
    ...(item.questionPrompt ? { questionPrompt: { ...item.questionPrompt } } : {}),
    ...(item.currentFeedback ? { currentFeedback: { ...item.currentFeedback } } : {}),
  };
}
