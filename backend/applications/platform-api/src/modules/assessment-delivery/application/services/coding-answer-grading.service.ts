import { Inject, Injectable, Logger } from '@nestjs/common';
import { CodeExecutionPolicyService } from '../../../code-execution/application/code-execution-policy.service.js';
import { CodeExecutionProvider } from '../../../code-execution/application/code-execution-provider.js';
import { AssessmentAttemptAnswer, AssessmentQuestion } from '../../domain/entities/index.js';
import { DEFAULT_EXECUTION_LIMITS } from '../../../code-execution/domain/code-execution-limits.js';

export interface CodingGradingTestCase {
  id: string;
  input: string;
  expectedOutput: string;
  visibility: 'PUBLIC_GRADED' | 'HIDDEN_GRADED';
  weight?: number;
}

@Injectable()
export class CodingAnswerGradingService {
  private readonly logger = new Logger(CodingAnswerGradingService.name);

  constructor(
    @Inject(CodeExecutionPolicyService)
    private readonly policyService: CodeExecutionPolicyService,
    @Inject('CODE_EXECUTION_PROVIDER')
    private readonly provider: CodeExecutionProvider,
  ) {}

  async gradeAnswer(
    answer: AssessmentAttemptAnswer,
    question: AssessmentQuestion,
  ): Promise<{
    status: 'AUTO_GRADED' | 'PENDING_MANUAL_REVIEW' | 'GRADING_FAILED';
    score?: number;
    feedback?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }> {
    const metadata = question.metadata as Record<string, unknown> | null | undefined;
    const rawTestCases = metadata?.gradingTestCases || metadata?.testCases;
    const testCases: CodingGradingTestCase[] = Array.isArray(rawTestCases)
      ? rawTestCases.map((tc: unknown) => {
          const item = tc as Record<string, unknown>;
          const base: CodingGradingTestCase = {
            id: String(item.id ?? ''),
            input: String(item.input ?? ''),
            expectedOutput: String(item.expectedOutput ?? ''),
            visibility: item.visibility === 'PUBLIC_GRADED' ? 'PUBLIC_GRADED' : 'HIDDEN_GRADED',
          };
          if (typeof item.weight === 'number') {
            base.weight = item.weight;
          }
          return base;
        })
      : [];

    if (testCases.length === 0) {
      return {
        status: 'PENDING_MANUAL_REVIEW',
        metadata: {
          reason: 'no_grading_tests_exist',
        },
        feedback: {
          message: 'No grading test cases defined for this question. Manual review required.',
        },
      };
    }

    const sourceCode = answer.answer.sourceCode;
    const language = answer.answer.language;

    if (typeof sourceCode !== 'string' || typeof language !== 'string') {
      return {
        status: 'AUTO_GRADED',
        score: 0,
        metadata: {
          error: 'invalid_payload',
        },
        feedback: {
          message: 'Invalid submission payload: sourceCode or language is missing.',
        },
      };
    }

    const lang = this.policyService.getLanguageById(language);
    if (!lang) {
      return {
        status: 'AUTO_GRADED',
        score: 0,
        metadata: {
          error: 'unsupported_language',
          submittedLanguage: language,
        },
        feedback: {
          message: `Unsupported language: ${language}.`,
        },
      };
    }

    const limits = DEFAULT_EXECUTION_LIMITS;
    try {
      this.policyService.validateRequest(
        language,
        sourceCode,
        null,
        testCases.map((tc) => ({
          input: tc.input,
          expectedOutput: tc.expectedOutput,
        })),
      );
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown validation error';
      return {
        status: 'AUTO_GRADED',
        score: 0,
        metadata: {
          error: 'validation_error',
          reason: 'Submission failed policy checks',
        },
        feedback: {
          message: `Submission failed policy checks: ${errMsg}`,
        },
      };
    }

    // Execute test cases
    const testResults: Array<{
      id: string;
      input: string;
      expectedOutput: string;
      stdout?: string;
      stderr?: string;
      verdict: string;
      passed: boolean;
      visibility: 'PUBLIC_GRADED' | 'HIDDEN_GRADED';
    }> = [];

    const providerLanguageId = lang.judge0Id ?? lang.pistonLanguage ?? language;

    for (const tc of testCases) {
      try {
        const providerResult = await this.provider.execute({
          providerLanguageId,
          sourceCode,
          stdin: tc.input,
          limits,
        });

        if (providerResult.verdict === 'PROVIDER_UNAVAILABLE') {
          this.logger.warn(`Provider unavailable while grading coding test case ${tc.id}`);
          return {
            status: 'PENDING_MANUAL_REVIEW',
            metadata: {
              reason: 'provider_unavailable',
            },
            feedback: {
              message: 'Execution provider is temporarily unavailable. Manual review required.',
            },
          };
        }

        const tcStdout = this.policyService.sanitizeOutput(
          providerResult.stdout,
          limits.maxOutputBytes,
        );
        const tcStderr = this.policyService.sanitizeOutput(
          providerResult.stderr,
          limits.maxOutputBytes,
        );

        let verdict = providerResult.verdict;
        let passed = verdict === 'ACCEPTED';

        if (passed) {
          const normStdout = this.normalizeWhitespace(tcStdout || '');
          const normExpected = this.normalizeWhitespace(tc.expectedOutput || '');
          if (normStdout !== normExpected) {
            verdict = 'WRONG_ANSWER';
            passed = false;
          }
        }

        testResults.push({
          id: tc.id,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          ...(tcStdout !== null ? { stdout: tcStdout } : {}),
          ...(tcStderr !== null ? { stderr: tcStderr } : {}),
          verdict,
          passed,
          visibility: tc.visibility || 'HIDDEN_GRADED',
        });
      } catch (err) {
        this.logger.error(`Error executing test case ${tc.id}:`, err);
        return {
          status: 'PENDING_MANUAL_REVIEW',
          metadata: {
            reason: 'provider_error',
            error: 'Execution provider error. Manual review required.',
          },
          feedback: {
            message:
              'An unexpected error occurred during execution grading. Manual review required.',
          },
        };
      }
    }

    // Calculate score
    const totalWeight = testCases.reduce((sum, tc) => sum + (tc.weight ?? 1), 0);
    const passedWeight = testResults.reduce((sum, tr, idx) => {
      const tc = testCases[idx];
      const weightVal = tc?.weight ?? 1;
      return sum + (tr.passed ? weightVal : 0);
    }, 0);

    const maxScoreVal = question.points.value();
    const scoreVal = totalWeight > 0 ? maxScoreVal * (passedWeight / totalWeight) : 0;

    // Filter and sanitize test results
    const publicResults = testResults
      .filter((tr) => tr.visibility === 'PUBLIC_GRADED')
      .map((tr) => ({
        id: tr.id,
        input: tr.input,
        expectedOutput: tr.expectedOutput,
        ...(tr.stdout !== null && tr.stdout !== undefined ? { stdout: tr.stdout } : {}),
        ...(tr.stderr !== null && tr.stderr !== undefined ? { stderr: tr.stderr } : {}),
        verdict: tr.verdict,
        passed: tr.passed,
        visibility: tr.visibility,
      }));

    const hiddenResults = testResults.filter((tr) => tr.visibility === 'HIDDEN_GRADED');
    const totalHiddenCount = hiddenResults.length;
    const passedHiddenCount = hiddenResults.filter((tr) => tr.passed).length;

    return {
      status: 'AUTO_GRADED',
      score: scoreVal,
      metadata: {
        publicTestResults: publicResults,
        passedHiddenCount,
        totalHiddenCount,
      },
      feedback: {
        publicTestResults: publicResults,
        passedHiddenCount,
        totalHiddenCount,
      },
    };
  }

  private normalizeWhitespace(str: string): string {
    return str
      .replace(/\r\n/g, '\n')
      .split('\n')
      .map((line) => line.trimEnd())
      .join('\n')
      .trim();
  }
}
