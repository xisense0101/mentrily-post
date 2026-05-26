import { AppError } from '@mentrily/service-core';
import { AssessmentAttempt } from '../../domain/entities/index.js';

export type AssessmentAttemptConflictReason =
  | 'ATTEMPT_EXPIRED'
  | 'ATTEMPT_NOT_EDITABLE'
  | 'ATTEMPT_NOT_SUBMITTABLE';

export function createAssessmentAttemptConflictError(input: {
  reason: AssessmentAttemptConflictReason;
  message: string;
  attempt: AssessmentAttempt;
}): AppError {
  return new AppError('CONFLICT', input.message, 409, {
    reason: input.reason,
    attemptId: input.attempt.id,
    attemptStatus: input.attempt.status,
    ...(input.attempt.expiresAt ? { expiresAt: input.attempt.expiresAt.toISOString() } : {}),
    serverNow: new Date().toISOString(),
  });
}
