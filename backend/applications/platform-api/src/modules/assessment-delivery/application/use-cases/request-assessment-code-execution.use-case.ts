import { Inject, Injectable } from '@nestjs/common';
import {
  AppError,
  PERMISSION_EVALUATOR,
  PermissionEvaluator,
  RequestContext,
} from '@mentrily/service-core';
import { PermissionCatalog } from '@mentrily/security-toolkit';
import { AssessmentAttemptRepository } from '../../domain/repositories/index.js';
import { QuestionKindEnum } from '../../domain/value-objects/index.js';
import { type AssessmentExecutionRequest } from '../../domain/entities/index.js';
import { ASSESSMENT_EXECUTION_PROVIDER, type AssessmentExecutionProvider } from '../ports/index.js';
import {
  type RequestAssessmentExecutionInput,
  type RequestAssessmentExecutionResponse,
} from '../dto/index.js';
import {
  mapAssessmentExecutionRequestToResponse,
  mapAssessmentExecutionResultToResponse,
} from '../mappers/index.js';
import { AssessmentExecutionReservationService } from '../services/index.js';
import { requireAssessmentActor } from '../support/index.js';

@Injectable()
export class RequestAssessmentCodeExecutionUseCase {
  constructor(
    @Inject(AssessmentAttemptRepository) private readonly attemptRepo: AssessmentAttemptRepository,
    @Inject(AssessmentExecutionReservationService)
    private readonly executionReservation: AssessmentExecutionReservationService,
    @Inject(ASSESSMENT_EXECUTION_PROVIDER)
    private readonly executionProvider: AssessmentExecutionProvider,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
  ) {}

  async execute(
    context: RequestContext,
    attemptId: string,
    input: RequestAssessmentExecutionInput,
  ): Promise<RequestAssessmentExecutionResponse> {
    const workspace = requireAssessmentActor(context);
    const perm = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.ASSESSMENT_EXECUTION_REQUEST, workspace },
      context,
    );
    if (!perm.allowed) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }

    const attempt = await this.attemptRepo.findById(attemptId);
    if (
      !attempt ||
      attempt.workspaceId !== workspace.workspaceId ||
      attempt.tenantId !== workspace.tenantId
    ) {
      throw new AppError('NOT_FOUND', 'attempt not found', 404);
    }

    const answer = attempt.answers.find((item) => item.id === input.answerId);
    if (!answer) {
      throw new AppError('NOT_FOUND', 'attempt answer not found', 404);
    }
    if (answer.questionKind !== QuestionKindEnum.CODE) {
      throw new AppError('VALIDATION_ERROR', 'execution is available only for code answers', 400);
    }

    const executionRequest = this.createExecutionRequest(
      context,
      attempt.id,
      answer,
      input.metadata,
    );
    const providerResult = await this.executionProvider.requestExecution({
      executionRequestId: executionRequest.id,
      kind: executionRequest.kind,
      ...(executionRequest.language !== undefined ? { language: executionRequest.language } : {}),
      ...(executionRequest.source !== undefined ? { source: executionRequest.source } : {}),
      resourceLimits: executionRequest.resourceLimits,
      metadata: executionRequest.metadata,
    });

    return {
      request: mapAssessmentExecutionRequestToResponse(executionRequest),
      result: mapAssessmentExecutionResultToResponse(providerResult),
    };
  }

  private createExecutionRequest(
    context: RequestContext,
    attemptId: string,
    answer: {
      id: string;
      questionId: string;
      questionKind: string;
      answer: Record<string, unknown>;
    },
    metadata: Record<string, unknown> | undefined,
  ): AssessmentExecutionRequest {
    const executionRequest = this.executionReservation.createReservedExecutionRequest({
      context,
      attemptId,
      answerId: answer.id,
      questionId: answer.questionId,
      questionKind: QuestionKindEnum.CODE,
      answer: answer.answer,
    });

    if (!executionRequest) {
      throw new AppError('VALIDATION_ERROR', 'execution request could not be created', 400);
    }
    executionRequest.metadata = metadata ? { ...metadata } : {};
    return executionRequest;
  }
}
