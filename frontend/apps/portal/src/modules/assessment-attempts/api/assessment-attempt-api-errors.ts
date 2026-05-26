import type { AssessmentAttemptConflictContract } from '../types';

export class AssessmentAttemptApiError extends Error {
  readonly status: number;
  readonly code?: string | undefined;
  readonly requestId?: string | undefined;
  readonly details?: AssessmentAttemptConflictContract | undefined;

  constructor(
    message: string,
    status: number,
    code?: string,
    requestId?: string,
    details?: AssessmentAttemptConflictContract,
  ) {
    super(message);
    this.name = 'AssessmentAttemptApiError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
    this.details = details;
  }
}
