import { Inject, Injectable } from '@nestjs/common';
import {
  AppError,
  PERMISSION_EVALUATOR,
  PermissionEvaluator,
  RequestContext,
  AUDIT_RECORDER,
  AuditRecorder,
} from '@mentrily/service-core';
import { PermissionCatalog } from '@mentrily/security-toolkit';
import { CodeExecutionPolicyService } from '../code-execution-policy.service.js';
import { CodeExecutionProvider } from '../code-execution-provider.js';
import { RunCodeSampleInput, CodeExecutionResultResponse } from '../dto/code-execution.dto.js';
import { requireAssessmentActor } from '../../../assessment-delivery/application/support/assessment-context.js';
import { DEFAULT_EXECUTION_LIMITS } from '../../domain/code-execution-limits.js';
import { CodeExecutionTrackerService } from '../code-execution-tracker.service.js';

import { PrismaService } from '@mentrily/data-platform';

@Injectable()
export class RunCodeSampleUseCase {
  constructor(
    @Inject(CodeExecutionPolicyService)
    private readonly policyService: CodeExecutionPolicyService,
    @Inject('CODE_EXECUTION_PROVIDER')
    private readonly provider: CodeExecutionProvider,
    @Inject(PERMISSION_EVALUATOR)
    private readonly permissionEvaluator: PermissionEvaluator,
    @Inject(AUDIT_RECORDER)
    private readonly auditRecorder: AuditRecorder,
    @Inject(CodeExecutionTrackerService)
    private readonly trackerService: CodeExecutionTrackerService,
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  async execute(
    context: RequestContext,
    input: RunCodeSampleInput,
  ): Promise<CodeExecutionResultResponse> {
    const workspace = requireAssessmentActor(context);
    const perm = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.WORKSPACE_READ, workspace },
      context,
    );
    if (!perm.allowed) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }

    const {
      language,
      sourceCode,
      stdin,
      publicTestCases,
      executionMode,
      attemptId,
      questionId,
      idempotencyKey,
    } = input;

    const mode = executionMode || 'SAMPLE_RUN';
    if (mode === 'RESERVED_GRADING_RUN') {
      throw new AppError('VALIDATION_ERROR', 'GRADING_RUN_NOT_AVAILABLE', 400);
    }
    if (mode !== 'SAMPLE_RUN' && mode !== 'PUBLIC_TEST_RUN') {
      throw new AppError('VALIDATION_ERROR', 'Unsupported execution mode', 400);
    }

    this.policyService.validateRequest(language, sourceCode, stdin, publicTestCases);

    if (!attemptId || !questionId) {
      throw new AppError(
        'VALIDATION_ERROR',
        'attemptId and questionId are required for code execution',
        400,
      );
    }

    const attempt = await this.prisma.assessmentAttempt.findUnique({
      where: { id: attemptId },
      include: {
        snapshot: true,
      },
    });

    if (!attempt) {
      throw new AppError('NOT_FOUND', 'attempt not found', 404);
    }

    if (
      attempt.workspaceId !== workspace.workspaceId ||
      attempt.tenantId !== workspace.tenantId ||
      attempt.learnerPrincipalId !== workspace.actorId
    ) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }

    const looseQuestions = Array.isArray(attempt.snapshot.looseQuestions)
      ? (attempt.snapshot.looseQuestions as Array<{ id: string }>)
      : [];
    const sections = Array.isArray(attempt.snapshot.sections)
      ? (attempt.snapshot.sections as Array<{ questions: Array<{ id: string }> }>)
      : [];

    const hasQuestionInLoose = looseQuestions.some((q) => q && q.id === questionId);
    const hasQuestionInSection = sections.some(
      (sec) =>
        sec && Array.isArray(sec.questions) && sec.questions.some((q) => q && q.id === questionId),
    );

    if (!hasQuestionInLoose && !hasQuestionInSection) {
      throw new AppError('VALIDATION_ERROR', 'question not found in attempt snapshot', 400);
    }

    const lang = this.policyService.getLanguageById(language)!;
    const limits = DEFAULT_EXECUTION_LIMITS;

    try {
      const check = await this.trackerService.acquireAndCheckLimits(
        workspace.workspaceId,
        workspace.actorId,
        attemptId,
        questionId,
        idempotencyKey,
      );

      if (check.cachedResult) {
        return check.cachedResult;
      }
      if (check.cachedPromise) {
        return await check.cachedPromise;
      }

      const executionPromise = (async (): Promise<CodeExecutionResultResponse> => {
        try {
          const providerRequest = {
            providerLanguageId: lang.judge0Id ?? lang.pistonLanguage ?? language,
            sourceCode,
            ...(stdin !== undefined && stdin !== null ? { stdin } : {}),
            limits,
          };

          const providerResult = await this.provider.execute(providerRequest);

          const sanitizedStdout = this.policyService.sanitizeOutput(
            providerResult.stdout,
            limits.maxOutputBytes,
          );
          const sanitizedStderr = this.policyService.sanitizeOutput(
            providerResult.stderr,
            limits.maxOutputBytes,
          );
          const sanitizedCompileOutput = this.policyService.sanitizeOutput(
            providerResult.compileOutput,
            limits.maxOutputBytes,
          );

          const testResults = [];
          if (publicTestCases && publicTestCases.length > 0) {
            for (const tc of publicTestCases) {
              const tcResult = await this.provider.execute({
                providerLanguageId: lang.judge0Id ?? lang.pistonLanguage ?? language,
                sourceCode,
                stdin: tc.input,
                limits,
              });

              const tcStdout = this.policyService.sanitizeOutput(
                tcResult.stdout,
                limits.maxOutputBytes,
              );
              const tcStderr = this.policyService.sanitizeOutput(
                tcResult.stderr,
                limits.maxOutputBytes,
              );

              let verdict = tcResult.verdict;
              let passed = verdict === 'ACCEPTED';

              if (passed && tc.expectedOutput !== undefined) {
                const normStdout = (tcStdout || '').trim();
                const normExpected = (tc.expectedOutput || '').trim();
                if (normStdout !== normExpected) {
                  verdict = 'WRONG_ANSWER';
                  passed = false;
                }
              }

              testResults.push({
                input: tc.input,
                ...(tc.expectedOutput !== undefined ? { expectedOutput: tc.expectedOutput } : {}),
                ...(tcStdout !== null ? { stdout: tcStdout } : {}),
                ...(tcStderr !== null ? { stderr: tcStderr } : {}),
                verdict,
                passed,
              });
            }
          }

          let overallVerdict = providerResult.verdict;
          if (testResults.length > 0) {
            const failedTc = testResults.find((r) => r.verdict !== 'ACCEPTED');
            if (failedTc) {
              overallVerdict = failedTc.verdict;
            }
          }

          let finalStderr = sanitizedStderr;
          if (overallVerdict === 'PROVIDER_UNAVAILABLE') {
            finalStderr = 'Execution provider encountered an internal error.';
          }

          return {
            status: providerResult.status,
            verdict: overallVerdict,
            language,
            ...(sanitizedStdout !== null ? { stdout: sanitizedStdout } : {}),
            ...(finalStderr !== null ? { stderr: finalStderr } : {}),
            ...(sanitizedCompileOutput !== null ? { compileOutput: sanitizedCompileOutput } : {}),
            ...(providerResult.executionTimeMs !== undefined &&
            providerResult.executionTimeMs !== null
              ? { executionTimeMs: providerResult.executionTimeMs }
              : {}),
            ...(providerResult.memoryKb !== undefined && providerResult.memoryKb !== null
              ? { memoryKb: providerResult.memoryKb }
              : {}),
            ...(testResults.length > 0 ? { testResults } : {}),
            createdAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
          };
        } catch (_error: unknown) {
          return {
            status: 'FAILED',
            verdict: 'PROVIDER_UNAVAILABLE',
            language,
            stdout: null,
            stderr: 'Execution provider encountered an internal error.',
            compileOutput: null,
            executionTimeMs: null,
            memoryKb: null,
            createdAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
          };
        }
      })();

      if (idempotencyKey) {
        this.trackerService.registerPromise(
          workspace.workspaceId,
          workspace.actorId,
          idempotencyKey,
          executionPromise,
        );
      }

      try {
        const result = await executionPromise;
        if (idempotencyKey) {
          this.trackerService.registerResult(
            workspace.workspaceId,
            workspace.actorId,
            idempotencyKey,
            result,
          );
        }
        check.release(false);

        // Record successful run audit log
        await this.auditRecorder.record(
          {
            action: 'code-execution.sample-run',
            actorId: workspace.actorId,
            targetType: 'workspace',
            targetId: workspace.workspaceId,
            metadata: {
              tenantId: workspace.tenantId,
              workspaceId: workspace.workspaceId,
              actorId: workspace.actorId,
              attemptId: attemptId ?? null,
              questionId: questionId ?? null,
              verdict: result.verdict,
              limits: {
                maxSourceBytes: limits.maxSourceBytes,
                maxStdInBytes: limits.maxStdInBytes,
                maxOutputBytes: limits.maxOutputBytes,
              },
              durationMs: result.executionTimeMs ?? null,
              timestamp: new Date().toISOString(),
            },
          },
          context,
        );

        return result;
      } catch (err) {
        check.release(true);
        throw err;
      }
    } catch (err) {
      // Record abuse block log
      if (err instanceof AppError && (err.statusCode === 429 || err.statusCode === 409)) {
        await this.auditRecorder.record(
          {
            action: 'code-execution.abuse-blocked',
            actorId: workspace.actorId,
            targetType: 'workspace',
            targetId: workspace.workspaceId,
            metadata: {
              tenantId: workspace.tenantId,
              workspaceId: workspace.workspaceId,
              actorId: workspace.actorId,
              attemptId: attemptId ?? null,
              questionId: questionId ?? null,
              reason: err.code,
              timestamp: new Date().toISOString(),
            },
          },
          context,
        );
      }
      throw err;
    }
  }
}
