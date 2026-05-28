import { Injectable } from '@nestjs/common';
import {
  CodeExecutionProvider,
  CodeExecutionProviderRequest,
  CodeExecutionProviderResult,
} from '../../application/code-execution-provider.js';
import { CodeExecutionConfig } from '../config/code-execution.config.js';

@Injectable()
export class Judge0CodeExecutionProvider implements CodeExecutionProvider {
  readonly providerName = 'judge0-code-execution-provider';

  constructor(private readonly config: CodeExecutionConfig) {}

  async getSupportedLanguages(): Promise<string[]> {
    return ['javascript', 'python', 'cpp', 'java'];
  }

  async execute(_request: CodeExecutionProviderRequest): Promise<CodeExecutionProviderResult> {
    if (!this.config.judge0Url) {
      return {
        status: 'FAILED',
        verdict: 'PROVIDER_UNAVAILABLE',
        stdout: null,
        stderr: 'Judge0 URL is not configured.',
        executionTimeMs: null,
        memoryKb: null,
      };
    }

    return {
      status: 'FAILED',
      verdict: 'PROVIDER_UNAVAILABLE',
      stdout: null,
      stderr: 'Judge0 integration is in shell mode.',
      executionTimeMs: null,
      memoryKb: null,
    };
  }

  async healthCheck(): Promise<{ healthy: boolean }> {
    return { healthy: !!this.config.judge0Url };
  }
}
