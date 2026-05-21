import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import {
  AppError,
  AUDIT_RECORDER,
  AuditRecorder,
  PERMISSION_EVALUATOR,
  PermissionEvaluator,
  RequestContext,
  TRANSACTION_RUNNER,
  TransactionRunner,
} from '@mentrily/service-core';
import { PermissionCatalog } from '@mentrily/security-toolkit';
import {
  Assessment,
  AssessmentVersion,
  AssessmentSection,
  AssessmentQuestion,
  GradingRubric,
  GradingRule,
  QuestionOption,
  QuestionAnswerKey,
  QuestionPoints,
  QuestionKind,
  GradingMode,
  AssessmentVisibilityEnum,
  ResultReleasePolicyEnum,
  AttemptPolicy,
  TimeLimit,
} from '../../domain/index.js';
import { AssessmentRepository } from '../../domain/repositories/index.js';
import { createAssessmentCreatedEvent } from '../../domain/events/index.js';
import { AssessmentEventPublisherService } from '../services/index.js';
import { mapAssessmentToResponse } from '../mappers/index.js';
import { CreateAssessmentInput, AssessmentResponse } from '../dto/index.js';
import { requireAssessmentActor } from '../support/index.js';

@Injectable()
export class CreateAssessmentUseCase {
  constructor(
    @Inject(AssessmentRepository) private readonly repo: AssessmentRepository,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
    @Inject(TRANSACTION_RUNNER) private readonly transactionRunner: TransactionRunner,
    @Inject(AUDIT_RECORDER) private readonly auditRecorder: AuditRecorder,
    @Inject(AssessmentEventPublisherService)
    private readonly eventPublisher: AssessmentEventPublisherService,
  ) {}

  async execute(
    context: RequestContext,
    input: CreateAssessmentInput,
  ): Promise<AssessmentResponse> {
    const workspace = requireAssessmentActor(context);
    const perm = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.ASSESSMENT_CREATE, workspace },
      context,
    );
    if (!perm.allowed) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }

    return this.transactionRunner.run(async (tx) => {
      const assessmentId = randomUUID();
      const versionId = randomUUID();

      const sections = (input.sections ?? []).map((s) =>
        AssessmentSection.create({
          id: s.id,
          assessmentId,
          title: s.title,
          ...(s.description !== undefined ? { description: s.description } : {}),
          position: s.position,
          metadata: s.metadata ?? {},
          questions: s.questions.map((q) =>
            AssessmentQuestion.create({
              id: q.id,
              assessmentId,
              sectionId: s.id,
              kind: q.kind as unknown as QuestionKind,
              title: q.title,
              prompt: q.prompt,
              options: q.options.map((o) =>
                QuestionOption.create(
                  o as unknown as {
                    id: string;
                    label: string;
                    value: string;
                    isCorrect?: boolean;
                    explanation?: string;
                  },
                ),
              ),
              ...(q.answerKey !== undefined
                ? { answerKey: QuestionAnswerKey.create(q.answerKey) }
                : {}),
              points: QuestionPoints.create(q.points),
              gradingMode: q.gradingMode as unknown as GradingMode,
              position: q.position,
              metadata: q.metadata ?? {},
            }),
          ),
        }),
      );

      const looseQuestions = (input.looseQuestions ?? []).map((q) =>
        AssessmentQuestion.create({
          id: q.id,
          assessmentId,
          kind: q.kind as unknown as QuestionKind,
          title: q.title,
          prompt: q.prompt,
          options: q.options.map((o) =>
            QuestionOption.create(
              o as unknown as {
                id: string;
                label: string;
                value: string;
                isCorrect?: boolean;
                explanation?: string;
              },
            ),
          ),
          ...(q.answerKey !== undefined
            ? { answerKey: QuestionAnswerKey.create(q.answerKey) }
            : {}),
          points: QuestionPoints.create(q.points),
          gradingMode: q.gradingMode as unknown as GradingMode,
          position: q.position,
          metadata: q.metadata ?? {},
        }),
      );

      const version = AssessmentVersion.createDraft({
        id: versionId,
        assessmentId,
        versionNumber: 1,
        sections,
        looseQuestions,
        createdByPrincipalId: workspace.actorId,
        createdAt: new Date(),
      });

      const assessment = Assessment.createDraft({
        id: assessmentId,
        tenantId: workspace.tenantId,
        workspaceId: workspace.workspaceId,
        ownerPrincipalId: workspace.actorId,
        purpose: input.purpose as unknown as import('../../domain/index.js').AssessmentPurpose,
        title: input.title,
        ...(input.description !== undefined ? { description: input.description } : {}),
        visibility:
          (input.visibility as unknown as
            | import('../../domain/index.js').AssessmentVisibility
            | undefined) ?? AssessmentVisibilityEnum.WORKSPACE,
        attemptPolicy: AttemptPolicy.create(
          input.attemptPolicy?.maxAttempts !== undefined
            ? {
                maxAttempts: input.attemptPolicy.maxAttempts,
                allowRetake: input.attemptPolicy?.allowRetake ?? false,
                shuffleQuestions: input.attemptPolicy?.shuffleQuestions ?? false,
                shuffleOptions: input.attemptPolicy?.shuffleOptions ?? false,
              }
            : {
                allowRetake: input.attemptPolicy?.allowRetake ?? false,
                shuffleQuestions: input.attemptPolicy?.shuffleQuestions ?? false,
                shuffleOptions: input.attemptPolicy?.shuffleOptions ?? false,
              },
        ),
        timeLimit: TimeLimit.create(input.timeLimitMinutes),
        resultReleasePolicy:
          (input.resultReleasePolicy as unknown as
            | import('../../domain/index.js').ResultReleasePolicy
            | undefined) ?? ResultReleasePolicyEnum.IMMEDIATE,
        metadata: input.metadata ?? {},
        currentDraftVersion: version,
        gradingRubrics: (input.gradingRubrics ?? []).map((r) =>
          GradingRubric.create({
            id: r.id,
            assessmentId,
            title: r.title,
            criteria:
              r.criteria as unknown as import('../../domain/entities/grading-rubric.entity.js').GradingRubricCriterion[],
          }),
        ),
        gradingRules: (input.gradingRules ?? []).map((r) =>
          GradingRule.create({
            id: r.id,
            assessmentId,
            ...(r.questionId !== undefined ? { questionId: r.questionId } : {}),
            mode: r.mode as unknown as GradingMode,
            ruleType: r.ruleType,
            config: r.config,
          }),
        ),
      });

      const saved = await this.repo.save(assessment, tx);

      await this.auditRecorder.record(
        {
          action: 'assessment.created',
          actorId: workspace.actorId,
          targetType: 'assessment',
          targetId: saved.id,
        },
        context,
        tx,
      );

      await this.eventPublisher.publishDomainEvent(
        createAssessmentCreatedEvent(saved.id, saved.tenantId, saved.workspaceId, {
          ownerPrincipalId: saved.ownerPrincipalId,
          purpose: String(saved.purpose),
          title: saved.title,
        }),
        context,
        tx,
      );

      return mapAssessmentToResponse(saved);
    });
  }
}
