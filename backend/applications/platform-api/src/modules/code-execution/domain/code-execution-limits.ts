import { CodeExecutionLimitContract } from '@mentrily/contract-catalog';

export const DEFAULT_EXECUTION_LIMITS: CodeExecutionLimitContract = {
  maxSourceBytes: 65536,
  maxStdInBytes: 16384,
  maxOutputBytes: 65536,
  cpuTimeLimitMs: 2000,
  wallTimeLimitMs: 8000,
  memoryLimitKb: 262144,
};
