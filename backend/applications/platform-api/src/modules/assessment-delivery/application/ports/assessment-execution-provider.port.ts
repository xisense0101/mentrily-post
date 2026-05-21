import type {
  AssessmentExecutionKind,
  AssessmentExecutionLanguage,
  AssessmentExecutionResourceLimits,
  AssessmentExecutionStatus,
} from '../../domain/value-objects/index.js';

export const ASSESSMENT_EXECUTION_PROVIDER = Symbol('ASSESSMENT_EXECUTION_PROVIDER');

export interface AssessmentExecutionProviderRequest {
  executionRequestId: string;
  kind: AssessmentExecutionKind;
  language?: AssessmentExecutionLanguage;
  source?: string;
  notebookJson?: Record<string, unknown>;
  resourceLimits: AssessmentExecutionResourceLimits;
  metadata: Record<string, unknown>;
}

export interface AssessmentExecutionProviderResult {
  executionRequestId: string;
  status: AssessmentExecutionStatus;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  durationMs?: number;
  memoryMb?: number;
  provider?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface AssessmentExecutionProvider {
  requestExecution(
    input: AssessmentExecutionProviderRequest,
  ): Promise<AssessmentExecutionProviderResult>;
  getExecutionResult(executionRequestId: string): Promise<AssessmentExecutionProviderResult | null>;
  cancelExecution(executionRequestId: string): Promise<void>;
}
