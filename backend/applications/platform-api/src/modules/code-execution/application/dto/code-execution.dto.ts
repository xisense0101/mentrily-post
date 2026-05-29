import {
  CodeExecutionLanguageContract,
  CodeExecutionModeContract,
  CodeExecutionResultContract,
  CodeExecutionTestCaseContract,
} from '@mentrily/contract-catalog';

export class RunCodeSampleInput {
  language!: string;
  sourceCode!: string;
  stdin?: string | null;
  publicTestCases?: CodeExecutionTestCaseContract[];
  executionMode?: CodeExecutionModeContract;
  attemptId?: string | null;
  questionId?: string | null;
  idempotencyKey?: string | null;
}

export type CodeExecutionLanguageResponse = CodeExecutionLanguageContract;
export type CodeExecutionResultResponse = CodeExecutionResultContract;
