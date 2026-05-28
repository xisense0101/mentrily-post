export interface CodeExecutionLanguageContract {
  id: string;
  displayName: string;
  fileExtension: string;
  defaultTemplate?: string;
}

export type CodeExecutionModeContract = 'SAMPLE_RUN' | 'PUBLIC_TEST_RUN' | 'RESERVED_GRADING_RUN';

export type CodeExecutionStatusContract =
  | 'QUEUED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type CodeExecutionVerdictContract =
  | 'ACCEPTED'
  | 'WRONG_ANSWER'
  | 'COMPILE_ERROR'
  | 'RUNTIME_ERROR'
  | 'TIME_LIMIT_EXCEEDED'
  | 'MEMORY_LIMIT_EXCEEDED'
  | 'OUTPUT_LIMIT_EXCEEDED'
  | 'INTERNAL_ERROR'
  | 'PROVIDER_UNAVAILABLE'
  | 'VALIDATION_ERROR';

export interface CodeExecutionLimitContract {
  maxSourceBytes: number;
  maxStdInBytes: number;
  maxOutputBytes: number;
  cpuTimeLimitMs: number;
  wallTimeLimitMs: number;
  memoryLimitKb: number;
}

export interface CodeExecutionTestCaseContract {
  input: string;
  expectedOutput?: string;
}

export interface CodeExecutionRequestContract {
  language: string;
  sourceCode: string;
  stdin?: string | null;
  publicTestCases?: CodeExecutionTestCaseContract[];
  executionMode: CodeExecutionModeContract;
  idempotencyKey?: string | null;
}

export interface CodeExecutionTestCaseResultContract {
  input: string;
  expectedOutput?: string;
  stdout?: string;
  stderr?: string;
  verdict: CodeExecutionVerdictContract;
  passed: boolean;
}

export interface CodeExecutionResultContract {
  executionId?: string;
  status: CodeExecutionStatusContract;
  verdict: CodeExecutionVerdictContract;
  language: string;
  stdout?: string | null;
  stderr?: string | null;
  compileOutput?: string | null;
  executionTimeMs?: number | null;
  memoryKb?: number | null;
  testResults?: CodeExecutionTestCaseResultContract[];
  createdAt?: string;
  completedAt?: string;
}

export interface CodeExecutionProviderHealthContract {
  healthy: boolean;
  providerName: string;
  timestamp: string;
}
