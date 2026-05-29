import { Injectable } from '@nestjs/common';
import { AppError } from '@mentrily/service-core';
import { SUPPORTED_LANGUAGES, CodeExecutionLanguage } from '../domain/code-execution-language.js';
import { DEFAULT_EXECUTION_LIMITS } from '../domain/code-execution-limits.js';

@Injectable()
export class CodeExecutionPolicyService {
  getLanguages(): CodeExecutionLanguage[] {
    return SUPPORTED_LANGUAGES;
  }

  getLanguageById(id: string): CodeExecutionLanguage | undefined {
    return SUPPORTED_LANGUAGES.find((lang) => lang.id === id);
  }

  validateRequest(
    languageId: string,
    sourceCode: string,
    stdin?: string | null,
    publicTestCases?: { input: string; expectedOutput?: string }[],
  ): void {
    const lang = this.getLanguageById(languageId);
    if (!lang) {
      throw new AppError('VALIDATION_ERROR', `Unsupported language: ${languageId}`, 400);
    }

    const limits = DEFAULT_EXECUTION_LIMITS;

    if (!sourceCode) {
      throw new AppError('VALIDATION_ERROR', 'Source code is required', 400);
    }

    if (Buffer.byteLength(sourceCode, 'utf8') > limits.maxSourceBytes) {
      throw new AppError(
        'VALIDATION_ERROR',
        `Source code exceeds limit of ${limits.maxSourceBytes} bytes`,
        400,
      );
    }

    if (stdin && Buffer.byteLength(stdin, 'utf8') > limits.maxStdInBytes) {
      throw new AppError(
        'VALIDATION_ERROR',
        `stdin exceeds limit of ${limits.maxStdInBytes} bytes`,
        400,
      );
    }

    if (publicTestCases) {
      if (publicTestCases.length > limits.maxPublicTestCases) {
        throw new AppError(
          'VALIDATION_ERROR',
          `Public test cases exceed limit of ${limits.maxPublicTestCases}`,
          400,
        );
      }
      for (const tc of publicTestCases) {
        if (Buffer.byteLength(tc.input, 'utf8') > limits.maxPublicTestCaseInputBytes) {
          throw new AppError(
            'VALIDATION_ERROR',
            `Public test case input exceeds limit of ${limits.maxPublicTestCaseInputBytes} bytes`,
            400,
          );
        }
        if (
          tc.expectedOutput &&
          Buffer.byteLength(tc.expectedOutput, 'utf8') > limits.maxPublicTestCaseExpectedOutputBytes
        ) {
          throw new AppError(
            'VALIDATION_ERROR',
            `Public test case expected output exceeds limit of ${limits.maxPublicTestCaseExpectedOutputBytes} bytes`,
            400,
          );
        }
      }
    }
  }

  sanitizeOutput(output: string | null | undefined, limit: number): string | null {
    if (output === undefined || output === null) {
      return null;
    }
    const buf = Buffer.from(output, 'utf8');
    if (buf.length <= limit) {
      return output;
    }
    const truncatedBuf = buf.subarray(0, limit);
    return truncatedBuf.toString('utf8') + '\n[Truncated - output limit exceeded]';
  }
}
