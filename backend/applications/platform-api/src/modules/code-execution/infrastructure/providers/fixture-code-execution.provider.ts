import { Injectable } from '@nestjs/common';
import {
  CodeExecutionProvider,
  CodeExecutionProviderRequest,
  CodeExecutionProviderResult,
} from '../../application/code-execution-provider.js';

@Injectable()
export class FixtureCodeExecutionProvider implements CodeExecutionProvider {
  readonly providerName = 'fixture-code-execution-provider';

  async getSupportedLanguages(): Promise<string[]> {
    return ['javascript', 'python', 'cpp', 'java'];
  }

  async execute(request: CodeExecutionProviderRequest): Promise<CodeExecutionProviderResult> {
    const { sourceCode, stdin } = request;

    if (sourceCode.includes('// simulate:COMPILE_ERROR')) {
      return {
        status: 'COMPLETED',
        verdict: 'COMPILE_ERROR',
        compileOutput: 'SyntaxError: Unexpected token simulation in compilation',
        stdout: null,
        stderr: null,
        executionTimeMs: 0,
        memoryKb: 0,
      };
    }

    if (sourceCode.includes('// simulate:RUNTIME_ERROR')) {
      return {
        status: 'COMPLETED',
        verdict: 'RUNTIME_ERROR',
        stdout: null,
        stderr: 'RuntimeError: simulated division by zero',
        executionTimeMs: 15,
        memoryKb: 1204,
      };
    }

    if (sourceCode.includes('// simulate:TIME_LIMIT_EXCEEDED')) {
      return {
        status: 'FAILED',
        verdict: 'TIME_LIMIT_EXCEEDED',
        stdout: null,
        stderr: 'Time limit exceeded',
        executionTimeMs: request.limits.cpuTimeLimitMs + 100,
        memoryKb: 4096,
      };
    }

    if (sourceCode.includes('// simulate:MEMORY_LIMIT_EXCEEDED')) {
      return {
        status: 'FAILED',
        verdict: 'MEMORY_LIMIT_EXCEEDED',
        stdout: null,
        stderr: 'Out of memory',
        executionTimeMs: 50,
        memoryKb: request.limits.memoryLimitKb + 1024,
      };
    }

    if (sourceCode.includes('// simulate:OUTPUT_LIMIT_EXCEEDED')) {
      const largeOutput = 'A'.repeat(request.limits.maxOutputBytes + 100);
      return {
        status: 'COMPLETED',
        verdict: 'OUTPUT_LIMIT_EXCEEDED',
        stdout: largeOutput,
        stderr: null,
        executionTimeMs: 10,
        memoryKb: 512,
      };
    }

    if (sourceCode.includes('// simulate:PROVIDER_UNAVAILABLE')) {
      return {
        status: 'FAILED',
        verdict: 'PROVIDER_UNAVAILABLE',
        stdout: null,
        stderr: null,
        executionTimeMs: null,
        memoryKb: null,
      };
    }

    if (sourceCode.includes('// simulate:WRONG_ANSWER')) {
      return {
        status: 'COMPLETED',
        verdict: 'WRONG_ANSWER',
        stdout: 'Actual Output: 42',
        stderr: null,
        executionTimeMs: 5,
        memoryKb: 100,
      };
    }

    let stdout = 'Hello, World!';
    if (stdin) {
      stdout = `Echo stdin: ${stdin}`;
    }

    return {
      status: 'COMPLETED',
      verdict: 'ACCEPTED',
      stdout,
      stderr: null,
      compileOutput: null,
      executionTimeMs: 25,
      memoryKb: 2048,
    };
  }

  async healthCheck(): Promise<{ healthy: boolean }> {
    return { healthy: true };
  }
}
