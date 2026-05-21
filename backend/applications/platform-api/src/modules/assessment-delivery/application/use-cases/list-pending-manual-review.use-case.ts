import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '@mentrily/data-platform';
import {
  AppError,
  PERMISSION_EVALUATOR,
  PermissionEvaluator,
  RequestContext,
} from '@mentrily/service-core';
import { PermissionCatalog } from '@mentrily/security-toolkit';
import {
  AssessmentManualReviewItemResponse,
  AssessmentManualReviewQueueResponse,
} from '../dto/index.js';
import { mapAssessmentManualReviewItemToResponse } from '../mappers/index.js';
import { requireAssessmentActor } from '../support/index.js';

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }

  return { ...(value as Record<string, unknown>) };
}

function resolveQuestionContext(input: {
  sections: unknown;
  looseQuestions: unknown;
  questionId: string;
}): { title?: string; prompt?: Record<string, unknown> } {
  const sections = Array.isArray(input.sections) ? input.sections : [];
  const looseQuestions = Array.isArray(input.looseQuestions) ? input.looseQuestions : [];

  for (const section of sections) {
    const sectionRecord = asRecord(section);
    const sectionQuestions = Array.isArray(sectionRecord.questions) ? sectionRecord.questions : [];
    for (const question of sectionQuestions) {
      const questionRecord = asRecord(question);
      if (questionRecord.id === input.questionId) {
        return {
          ...(typeof questionRecord.title === 'string' ? { title: questionRecord.title } : {}),
          ...(questionRecord.prompt && typeof questionRecord.prompt === 'object'
            ? { prompt: asRecord(questionRecord.prompt) }
            : {}),
        };
      }
    }
  }

  for (const question of looseQuestions) {
    const questionRecord = asRecord(question);
    if (questionRecord.id === input.questionId) {
      return {
        ...(typeof questionRecord.title === 'string' ? { title: questionRecord.title } : {}),
        ...(questionRecord.prompt && typeof questionRecord.prompt === 'object'
          ? { prompt: asRecord(questionRecord.prompt) }
          : {}),
      };
    }
  }

  return {};
}

@Injectable()
export class ListPendingManualReviewUseCase {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
  ) {}

  async execute(context: RequestContext): Promise<AssessmentManualReviewQueueResponse> {
    const workspace = requireAssessmentActor(context);
    const perm = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.ASSESSMENT_GRADING_PENDING_REVIEW_READ, workspace },
      context,
    );
    if (!perm.allowed) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }

    const records = await this.prisma.assessmentAnswerGrade.findMany({
      where: {
        status: 'PENDING_MANUAL_REVIEW',
        gradingRun: {
          tenantId: workspace.tenantId,
          workspaceId: workspace.workspaceId,
        },
      },
      include: {
        gradingRun: true,
        attempt: {
          include: {
            assessment: true,
            snapshot: true,
          },
        },
        answer: true,
      },
      orderBy: [{ createdAt: 'asc' }, { answerId: 'asc' }],
    });

    const items = records.map((record): AssessmentManualReviewItemResponse => {
      const contextData = resolveQuestionContext({
        sections: record.attempt.snapshot.sections,
        looseQuestions: record.attempt.snapshot.looseQuestions,
        questionId: record.questionId,
      });

      return mapAssessmentManualReviewItemToResponse({
        gradingRunId: record.gradingRunId,
        answerGradeId: record.id,
        attemptId: record.attemptId,
        answerId: record.answerId,
        assessmentId: record.attempt.assessmentId,
        snapshotId: record.attempt.snapshotId,
        questionId: record.questionId,
        questionKind: record.questionKind,
        ...(contextData.title ? { questionTitle: contextData.title } : {}),
        ...(contextData.prompt ? { questionPrompt: contextData.prompt } : {}),
        maxScore: record.maxScore,
        ...(record.score !== null ? { currentScore: record.score } : {}),
        ...(record.feedback && typeof record.feedback === 'object'
          ? { currentFeedback: asRecord(record.feedback) }
          : {}),
        learnerAnswer: asRecord(record.answer.answer),
        learnerPrincipalId: record.attempt.learnerPrincipalId,
        ...(record.attempt.assessment.title
          ? { assessmentTitle: record.attempt.assessment.title }
          : {}),
        ...(record.attempt.submittedAt
          ? { submittedAt: record.attempt.submittedAt.toISOString() }
          : {}),
        status: record.status,
        method: record.method,
      });
    });

    return { items };
  }
}
