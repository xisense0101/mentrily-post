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
}

export type CodeExecutionLanguageResponse = CodeExecutionLanguageContract;
export type CodeExecutionResultResponse = CodeExecutionResultContract;
