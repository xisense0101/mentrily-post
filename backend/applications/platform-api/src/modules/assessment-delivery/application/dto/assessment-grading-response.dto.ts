import type {
  AssessmentAnswerGradeStatusContract,
  AssessmentGradingMethodContract,
  AssessmentGradingRunStatusContract,
  AssessmentQuestionKindContract,
} from '@mentrily/contract-catalog';

export interface AssessmentAnswerGradeResponse {
  id: string;
  attemptId: string;
  answerId: string;
  questionId: string;
  questionKind: AssessmentQuestionKindContract;
  status: AssessmentAnswerGradeStatusContract;
  method: AssessmentGradingMethodContract;
  score?: number;
  maxScore: number;
  feedback?: Record<string, unknown>;
  gradedByPrincipalId?: string;
  gradedAt?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentGradingRunResponse {
  id: string;
  attemptId: string;
  assessmentId: string;
  snapshotId: string;
  status: AssessmentGradingRunStatusContract;
  totalScore?: number;
  maxScore?: number;
  answerGrades: AssessmentAnswerGradeResponse[];
  hasPendingManualReview: boolean;
  startedAt: string;
  completedAt?: string;
  failedAt?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentManualReviewItemResponse {
  gradingRunId: string;
  answerGradeId: string;
  attemptId: string;
  answerId: string;
  assessmentId: string;
  snapshotId: string;
  questionId: string;
  questionKind: AssessmentQuestionKindContract;
  questionTitle?: string;
  questionPrompt?: Record<string, unknown>;
  maxScore: number;
  currentScore?: number;
  currentFeedback?: Record<string, unknown>;
  learnerAnswer: Record<string, unknown>;
  learnerPrincipalId: string;
  assessmentTitle?: string;
  submittedAt?: string;
  status: AssessmentAnswerGradeStatusContract;
  method: AssessmentGradingMethodContract;
}

export interface AssessmentManualReviewQueueResponse {
  items: AssessmentManualReviewItemResponse[];
}
