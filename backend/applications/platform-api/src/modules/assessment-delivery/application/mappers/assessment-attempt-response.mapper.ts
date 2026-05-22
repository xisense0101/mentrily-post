/**
 * AssessmentAttemptResponseMapper
 * Maps domain attempt aggregate to response DTOs
 */

import {
  AssessmentAttempt,
  AssessmentAttemptAnswer,
  AssessmentAttemptSession,
  AssessmentAttemptResult,
} from '../../domain/entities/index.js';
import {
  AssessmentAttemptResponse,
  AssessmentAttemptAnswerResponse,
  AssessmentAttemptSessionResponse,
  AssessmentAttemptResultResponse,
} from '../dto/index.js';
import { readFileUploadAnswerMediaAssetIds, readSubmittedFiles } from '../support/index.js';

export function mapAttemptSessionToResponse(
  session: AssessmentAttemptSession,
): AssessmentAttemptSessionResponse {
  return {
    id: session.id,
    startedAt: session.startedAt.toISOString(),
    lastSeenAt: session.lastSeenAt.toISOString(),
    ...(session.expiresAt !== undefined ? { expiresAt: session.expiresAt.toISOString() } : {}),
    ...(session.submittedAt !== undefined
      ? { submittedAt: session.submittedAt.toISOString() }
      : {}),
  };
}

export function mapAttemptAnswerToResponse(
  answer: AssessmentAttemptAnswer,
): AssessmentAttemptAnswerResponse {
  const submittedFiles = readSubmittedFiles(answer.answer);
  return {
    id: answer.id,
    questionId: answer.questionId,
    questionKind: answer.questionKind,
    answer:
      answer.questionKind === 'FILE_UPLOAD'
        ? { mediaAssetIds: readFileUploadAnswerMediaAssetIds(answer.answer) }
        : { ...answer.answer },
    status: answer.status,
    savedAt: answer.savedAt.toISOString(),
    ...(answer.submittedAt !== undefined ? { submittedAt: answer.submittedAt.toISOString() } : {}),
    metadata: { ...answer.metadata },
    ...(submittedFiles.length > 0 ? { submittedFiles } : {}),
  };
}

export function mapAttemptResultToResponse(
  result: AssessmentAttemptResult,
): AssessmentAttemptResultResponse {
  return {
    id: result.id,
    gradingStatus: result.gradingStatus,
    ...(result.score !== undefined ? { score: result.score.value } : {}),
    ...(result.maxScore !== undefined ? { maxScore: result.maxScore.value } : {}),
    ...(result.releasedAt !== undefined ? { releasedAt: result.releasedAt.toISOString() } : {}),
    createdAt: result.createdAt.toISOString(),
    updatedAt: result.updatedAt.toISOString(),
  };
}

export function mapAttemptToResponse(attempt: AssessmentAttempt): AssessmentAttemptResponse {
  return {
    id: attempt.id,
    assessmentId: attempt.assessmentId,
    snapshotId: attempt.snapshotId,
    snapshotVersionNumber: attempt.snapshotVersionNumber,
    learnerPrincipalId: attempt.learnerPrincipalId,
    status: attempt.status,
    session: mapAttemptSessionToResponse(attempt.session),
    answers: attempt.answers.map(mapAttemptAnswerToResponse),
    ...(attempt.result !== undefined ? { result: mapAttemptResultToResponse(attempt.result) } : {}),
    startedAt: attempt.startedAt.toISOString(),
    ...(attempt.submittedAt !== undefined
      ? { submittedAt: attempt.submittedAt.toISOString() }
      : {}),
    ...(attempt.expiresAt !== undefined ? { expiresAt: attempt.expiresAt.toISOString() } : {}),
    ...(attempt.cancelledAt !== undefined
      ? { cancelledAt: attempt.cancelledAt.toISOString() }
      : {}),
    metadata: { ...attempt.metadata },
    createdAt: attempt.createdAt.toISOString(),
    updatedAt: attempt.updatedAt.toISOString(),
  };
}
