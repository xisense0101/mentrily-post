import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { RequestContext } from '@mentrily/service-core';
import {
  AssessmentExecutionRequest,
  type AssessmentExecutionLanguage,
  AssessmentExecutionResourceLimits,
  QuestionKindEnum,
  isValidAssessmentExecutionLanguage,
} from '../../domain/index.js';
import type { QuestionKind } from '../../domain/value-objects/question-kind.vo.js';

@Injectable()
export class AssessmentExecutionReservationService {
  private readonly defaultLimits: AssessmentExecutionResourceLimits;

  constructor() {
    this.defaultLimits = AssessmentExecutionResourceLimits.create({
      timeoutMs: 2000,
      memoryMb: 256,
    });
  }

  isExecutionRequired(input: { questionKind: AssessmentQuestionKind }): boolean {
    return (
      input.questionKind === QuestionKindEnum.CODE ||
      input.questionKind === QuestionKindEnum.NOTEBOOK
    );
  }

  createReservedExecutionRequest(input: {
    context: RequestContext;
    attemptId: string;
    answerId: string;
    questionId: string;
    questionKind: AssessmentQuestionKind;
    answer: Record<string, unknown>;
  }): AssessmentExecutionRequest | null {
    if (!this.isExecutionRequired({ questionKind: input.questionKind })) {
      return null;
    }

    const executionKind =
      input.questionKind === QuestionKindEnum.CODE
        ? QuestionKindEnum.CODE
        : QuestionKindEnum.NOTEBOOK;

    const workspace = input.context.workspace;
    if (!workspace?.tenantId || !workspace.workspaceId || !workspace.actorId) {
      throw new Error('Execution reservation requires tenant/workspace/actor context');
    }

    const { language, source, notebookJson } = this.extractExecutionPayload(
      input.questionKind,
      input.answer,
    );

    return AssessmentExecutionRequest.createReserved({
      id: randomUUID(),
      tenantId: workspace.tenantId,
      workspaceId: workspace.workspaceId,
      attemptId: input.attemptId,
      answerId: input.answerId,
      questionId: input.questionId,
      kind: executionKind,
      ...(language !== undefined ? { language } : {}),
      ...(source !== undefined ? { source } : {}),
      ...(notebookJson !== undefined ? { notebookJson } : {}),
      resourceLimits: this.defaultLimits,
      requestedByPrincipalId: workspace.actorId,
      metadata: {},
    });
  }

  private extractExecutionPayload(
    questionKind: AssessmentQuestionKind,
    answer: Record<string, unknown>,
  ): {
    language?: AssessmentExecutionLanguage;
    source?: string;
    notebookJson?: Record<string, unknown>;
  } {
    if (questionKind === QuestionKindEnum.CODE) {
      const sourceValue =
        typeof answer.sourceCode === 'string'
          ? answer.sourceCode
          : typeof answer.source === 'string'
            ? answer.source
            : undefined;
      const languageValue =
        typeof answer.language === 'string' ? answer.language.trim() : undefined;
      const language =
        languageValue && isValidAssessmentExecutionLanguage(languageValue)
          ? languageValue
          : undefined;
      return {
        ...(sourceValue !== undefined ? { source: sourceValue } : {}),
        ...(language !== undefined ? { language } : {}),
      };
    }

    if (questionKind === QuestionKindEnum.NOTEBOOK) {
      const notebookValue = answer.notebookJson;
      if (notebookValue && typeof notebookValue === 'object' && !Array.isArray(notebookValue)) {
        return { notebookJson: notebookValue as Record<string, unknown> };
      }
    }

    return {};
  }
}

export type AssessmentQuestionKind = QuestionKind;
