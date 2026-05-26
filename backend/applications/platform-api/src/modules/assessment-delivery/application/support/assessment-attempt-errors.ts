import { AppError } from '@mentrily/service-core';
import type { AssessmentAttemptConflictReasonContract } from '@mentrily/contract-catalog';
import { AssessmentAttempt } from '../../domain/entities/index.js';

export function createAssessmentAttemptConflictError(input: {
  reason: AssessmentAttemptConflictReasonContract;
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
