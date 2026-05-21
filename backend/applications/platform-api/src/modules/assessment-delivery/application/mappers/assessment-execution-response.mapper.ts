import type { AssessmentExecutionProviderResult } from '../ports/index.js';
import type {
  AssessmentExecutionRequestResponse,
  AssessmentExecutionResultResponse,
} from '../dto/index.js';
import type { AssessmentExecutionRequest } from '../../domain/entities/index.js';

const OUTPUT_LIMIT = 4000;
const ERROR_LIMIT = 1000;

function limitString(value: string | undefined, maxLength: number): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return value.length > maxLength ? `${value.slice(0, maxLength)}...[truncated]` : value;
}

export function mapAssessmentExecutionRequestToResponse(
  request: AssessmentExecutionRequest,
): AssessmentExecutionRequestResponse {
  return {
    executionRequestId: request.id,
    attemptId: request.attemptId,
    answerId: request.answerId,
    questionId: request.questionId,
    kind: request.kind,
    ...(request.language !== undefined ? { language: request.language } : {}),
    status: request.status,
    requestedAt: request.requestedAt.toISOString(),
  };
}

export function mapAssessmentExecutionResultToResponse(
  result: AssessmentExecutionProviderResult,
): AssessmentExecutionResultResponse {
  return {
    executionRequestId: result.executionRequestId,
    status: result.status,
    ...(result.provider !== undefined ? { provider: result.provider } : {}),
    ...(limitString(result.stdout, OUTPUT_LIMIT) !== undefined
      ? { stdout: limitString(result.stdout, OUTPUT_LIMIT) }
      : {}),
    ...(limitString(result.stderr, OUTPUT_LIMIT) !== undefined
      ? { stderr: limitString(result.stderr, OUTPUT_LIMIT) }
      : {}),
    ...(result.exitCode !== undefined ? { exitCode: result.exitCode } : {}),
    ...(result.durationMs !== undefined ? { durationMs: result.durationMs } : {}),
    ...(result.memoryMb !== undefined ? { memoryMb: result.memoryMb } : {}),
    ...(limitString(result.error, ERROR_LIMIT) !== undefined
      ? { error: limitString(result.error, ERROR_LIMIT) }
      : {}),
    metadata: result.metadata ? { ...result.metadata } : {},
  };
}
