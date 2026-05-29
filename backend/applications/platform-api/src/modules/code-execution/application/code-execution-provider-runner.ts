import { Injectable, Logger } from '@nestjs/common';
import {
  CodeExecutionProvider,
  CodeExecutionProviderRequest,
  CodeExecutionProviderResult,
} from './code-execution-provider.js';

@Injectable()
export class CodeExecutionProviderRunner implements CodeExecutionProvider {
  private readonly logger = new Logger(CodeExecutionProviderRunner.name);

  constructor(
    private readonly delegate: CodeExecutionProvider,
    private readonly clientTimeoutMs: number = 10000,
  ) {}

  get providerName(): string {
    return `runner(${this.delegate.providerName})`;
  }

  async getSupportedLanguages(): Promise<string[]> {
    return this.delegate.getSupportedLanguages();
  }

  async execute(request: CodeExecutionProviderRequest): Promise<CodeExecutionProviderResult> {
    const maxRetries = 3;
    const clientTimeoutMs = this.clientTimeoutMs; // client timeout for API requests

    let attempt = 0;
    while (attempt < maxRetries) {
      attempt++;
      try {
        const result = await this.executeWithTimeout(request, clientTimeoutMs);
        if (result.verdict === 'PROVIDER_UNAVAILABLE') {
          // If transient provider failure, retry
          this.logger.warn(
            `Provider returned PROVIDER_UNAVAILABLE on attempt ${attempt}. Retrying...`,
          );
          if (attempt < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
            continue;
          }
        }
        return result;
      } catch (err: unknown) {
        const sanitizedMsg = this.sanitizeErrorMessage(err);
        this.logger.error(
          `Provider execution failed on attempt ${attempt} with error: ${sanitizedMsg}`,
        );
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
          continue;
        }
        return {
          status: 'FAILED',
          verdict: 'PROVIDER_UNAVAILABLE',
          stdout: null,
          stderr: 'Execution provider encountered an internal error.',
          executionTimeMs: null,
          memoryKb: null,
        };
      }
    }

    return {
      status: 'FAILED',
      verdict: 'PROVIDER_UNAVAILABLE',
      stdout: null,
      stderr: 'Execution provider encountered an internal error.',
      executionTimeMs: null,
      memoryKb: null,
    };
  }

  private async executeWithTimeout(
    request: CodeExecutionProviderRequest,
    timeoutMs: number,
  ): Promise<CodeExecutionProviderResult> {
    let timeoutId: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error('Executor client timeout'));
      }, timeoutMs);
    });

    try {
      const result = await Promise.race([this.delegate.execute(request), timeoutPromise]);
      return result;
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  private sanitizeErrorMessage(err: unknown): string {
    if (!err) return 'Unknown error';
    const rawMessage = err instanceof Error ? err.message : String(err);
    let clean = rawMessage;
    // Strip URLs
    clean = clean.replace(/https?:\/\/[^\s]+/g, '[REDACTED_URL]');
    // Strip Authorization/Bearer tokens or keys if present
    clean = clean.replace(
      /(?:bearer|token|key|secret|password|auth|apikey)[=: ]+[^\s]+/gi,
      '[REDACTED_SECRET]',
    );
    // Limit length to avoid logging huge raw dumps
    if (clean.length > 200) {
      clean = clean.slice(0, 200) + '...';
    }
    return clean;
  }

  async healthCheck?(): Promise<{ healthy: boolean }> {
    if (this.delegate.healthCheck) {
      return this.delegate.healthCheck();
    }
    return { healthy: true };
  }
}
