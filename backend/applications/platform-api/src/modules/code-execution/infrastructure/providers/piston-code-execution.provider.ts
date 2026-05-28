import { Injectable } from '@nestjs/common';
import {
  CodeExecutionProvider,
  CodeExecutionProviderRequest,
  CodeExecutionProviderResult,
} from '../../application/code-execution-provider.js';
import { CodeExecutionConfig } from '../config/code-execution.config.js';

@Injectable()
export class PistonCodeExecutionProvider implements CodeExecutionProvider {
  readonly providerName = 'piston-code-execution-provider';

  constructor(private readonly config: CodeExecutionConfig) {}

  async getSupportedLanguages(): Promise<string[]> {
    return ['javascript', 'python', 'cpp', 'java'];
  }

  async execute(_request: CodeExecutionProviderRequest): Promise<CodeExecutionProviderResult> {
    if (!this.config.pistonUrl) {
      return {
        status: 'FAILED',
        verdict: 'PROVIDER_UNAVAILABLE',
        stdout: null,
        stderr: 'Piston URL is not configured.',
        executionTimeMs: null,
        memoryKb: null,
      };
    }

    return {
      status: 'FAILED',
      verdict: 'PROVIDER_UNAVAILABLE',
      stdout: null,
      stderr: 'Piston integration is in shell mode.',
      executionTimeMs: null,
      memoryKb: null,
    };
  }

  async healthCheck(): Promise<{ healthy: boolean }> {
    return { healthy: !!this.config.pistonUrl };
  }
}
