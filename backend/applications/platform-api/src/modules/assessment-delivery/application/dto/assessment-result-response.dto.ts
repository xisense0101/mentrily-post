import type {
  AssessmentAttemptAnswerStatusContract,
  AssessmentAttemptGradingStatusContract,
  AssessmentAttemptStatusContract,
  AssessmentGradingMethodContract,
  AssessmentQuestionKindContract,
  CodingResultSummaryContract,
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
  /** Raw feedback — do not render generically; codingResult is the safe surface for CODE questions */
  feedback?: Record<string, unknown>;
  answerStatus: AssessmentAttemptAnswerStatusContract;
  /** Safe coding result summary — present only for CODE questions */
  codingResult?: CodingResultSummaryContract;
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
