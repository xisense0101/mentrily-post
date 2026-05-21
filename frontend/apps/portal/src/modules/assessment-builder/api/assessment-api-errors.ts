export class AssessmentApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string | undefined,
    readonly requestId?: string | undefined,
  ) {
    super(message);
    this.name = 'AssessmentApiError';
  }
}
