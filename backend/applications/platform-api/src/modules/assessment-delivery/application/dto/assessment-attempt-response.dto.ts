/**
 * Assessment Attempt Response DTOs
 */

import type {
  AssessmentSubmittedFileContract,
  AssessmentAttemptStatusContract,
  AssessmentAttemptAnswerStatusContract,
  AssessmentAttemptGradingStatusContract,
  AssessmentQuestionKindContract,
} from '@mentrily/contract-catalog';

export interface AssessmentAttemptSessionResponse {
  id: string;
  startedAt: string;
  lastSeenAt: string;
  expiresAt?: string;
  submittedAt?: string;
}

export interface AssessmentAttemptAnswerResponse {
  id: string;
  questionId: string;
  questionKind: AssessmentQuestionKindContract;
  answer: Record<string, unknown>;
  status: AssessmentAttemptAnswerStatusContract;
  savedAt: string;
  submittedAt?: string;
  metadata: Record<string, unknown>;
  submittedFiles?: AssessmentSubmittedFileContract[] | undefined;
}

export interface AssessmentAttemptResultResponse {
  id: string;
  gradingStatus: AssessmentAttemptGradingStatusContract;
  score?: number;
  maxScore?: number;
  releasedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentAttemptResponse {
  id: string;
  assessmentId: string;
  snapshotId: string;
  snapshotVersionNumber: number;
  learnerPrincipalId: string;
  status: AssessmentAttemptStatusContract;
  session: AssessmentAttemptSessionResponse;
  answers: AssessmentAttemptAnswerResponse[];
  result?: AssessmentAttemptResultResponse;
  startedAt: string;
  submittedAt?: string;
  expiresAt?: string;
  cancelledAt?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
