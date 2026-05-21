export class AssessmentAttemptApiError extends Error {
  readonly status: number;
  readonly code?: string | undefined;
  readonly requestId?: string | undefined;

  constructor(message: string, status: number, code?: string, requestId?: string) {
    super(message);
    this.name = 'AssessmentAttemptApiError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}
