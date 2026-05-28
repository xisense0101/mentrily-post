import {
  CodeExecutionLimitContract,
  CodeExecutionVerdictContract,
  CodeExecutionStatusContract,
} from '@mentrily/contract-catalog';

export interface CodeExecutionProviderRequest {
  providerLanguageId: string | number;
  sourceCode: string;
  stdin?: string | null;
  limits: CodeExecutionLimitContract;
}

export interface CodeExecutionProviderResult {
  status: CodeExecutionStatusContract;
  verdict: CodeExecutionVerdictContract;
  stdout?: string | null;
  stderr?: string | null;
  compileOutput?: string | null;
  executionTimeMs?: number | null;
  memoryKb?: number | null;
  providerTraceId?: string | null;
}

export interface CodeExecutionProvider {
  providerName: string;
  getSupportedLanguages(): Promise<string[]>;
  execute(request: CodeExecutionProviderRequest): Promise<CodeExecutionProviderResult>;
  healthCheck?(): Promise<{ healthy: boolean }>;
}
