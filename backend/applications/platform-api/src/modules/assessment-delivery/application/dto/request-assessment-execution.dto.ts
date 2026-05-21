import type {
  AssessmentExecutionKindContract,
  AssessmentExecutionLanguageContract,
  AssessmentExecutionStatusContract,
} from '@mentrily/contract-catalog';

export interface RequestAssessmentExecutionInput {
  answerId: string;
  metadata?: Record<string, unknown> | undefined;
}

export interface CancelAssessmentExecutionInput {
  executionRequestId: string;
}

export interface AssessmentExecutionRequestResponse {
  executionRequestId: string;
  attemptId: string;
  answerId: string;
  questionId: string;
  kind: AssessmentExecutionKindContract;
  language?: AssessmentExecutionLanguageContract | undefined;
  status: AssessmentExecutionStatusContract;
  requestedAt: string;
}

export interface AssessmentExecutionResultResponse {
  executionRequestId: string;
  status: AssessmentExecutionStatusContract;
  provider?: string | undefined;
  stdout?: string | undefined;
  stderr?: string | undefined;
  exitCode?: number | undefined;
  durationMs?: number | undefined;
  memoryMb?: number | undefined;
  error?: string | undefined;
  metadata: Record<string, unknown>;
}

export interface RequestAssessmentExecutionResponse {
  request: AssessmentExecutionRequestResponse;
  result: AssessmentExecutionResultResponse;
}
