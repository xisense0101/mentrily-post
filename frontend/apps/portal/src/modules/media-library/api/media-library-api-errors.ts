export class MediaLibraryApiError extends Error {
  public readonly status: number;
  public readonly code?: string | undefined;
  public readonly details?: unknown;

  public constructor(input: {
    message: string;
    status: number;
    code?: string | undefined;
    details?: unknown;
  }) {
    super(input.message);
    this.name = 'MediaLibraryApiError';
    this.status = input.status;
    this.code = input.code;
    this.details = input.details;
  }
}
