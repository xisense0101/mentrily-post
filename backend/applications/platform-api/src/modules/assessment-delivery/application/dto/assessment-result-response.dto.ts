import type {
  AssessmentAttemptAnswerStatusContract,
  AssessmentAttemptGradingStatusContract,
  AssessmentAttemptStatusContract,
  AssessmentGradingMethodContract,
  AssessmentQuestionKindContract,
} from '@mentrily/contract-catalog';

export interface AssessmentResultSummaryResponse {
  attemptId: string;
  assessmentId: string;
  snapshotId: string;
  learnerPrincipalId: string;
  status: AssessmentAttemptStatusContract;
  gradingStatus: AssessmentAttemptGradingStatusContract;
  score?: number;
  maxScore?: number;
  releasedAt?: string;
  submittedAt?: string;
}

export interface AssessmentAnswerResultResponse {
  questionId: string;
  questionKind: AssessmentQuestionKindContract;
  score?: number;
  maxScore?: number;
  feedback?: Record<string, unknown>;
  answerStatus: AssessmentAttemptAnswerStatusContract;
}

export interface AssessmentLearnerResultResponse extends AssessmentResultSummaryResponse {
  answers: AssessmentAnswerResultResponse[];
}

export interface AssessmentInstructorAnswerResultResponse extends AssessmentAnswerResultResponse {
  answerId: string;
  answerGradeId?: string;
  learnerAnswer: Record<string, unknown>;
  gradingMethod?: AssessmentGradingMethodContract;
  gradedAt?: string;
  gradedByPrincipalId?: string;
}

export interface AssessmentInstructorResultResponse extends AssessmentResultSummaryResponse {
  gradingRunId?: string;
  answers: AssessmentInstructorAnswerResultResponse[];
  feedback?: Record<string, unknown>;
}

export type ReleaseAssessmentResultResponse = AssessmentInstructorResultResponse;
