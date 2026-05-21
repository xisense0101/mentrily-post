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
} from '../../domain/index.js';
import { AssessmentRepository } from '../../domain/repositories/index.js';
import { createAssessmentContentReplacedEvent } from '../../domain/events/index.js';
import { AssessmentEventPublisherService } from '../services/index.js';
import { mapAssessmentToResponse } from '../mappers/index.js';
import { ReplaceAssessmentContentInput, AssessmentResponse } from '../dto/index.js';
import { requireAssessmentActor } from '../support/index.js';

@Injectable()
export class ReplaceAssessmentContentUseCase {
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
    assessmentId: string,
    input: ReplaceAssessmentContentInput,
  ): Promise<AssessmentResponse> {
    const workspace = requireAssessmentActor(context);
    const perm = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.ASSESSMENT_UPDATE, workspace },
      context,
    );
    if (!perm.allowed) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }

    return this.transactionRunner
      .run(async (tx) => {
        const assessment = await this.repo.findById(assessmentId, tx);
        if (!assessment || assessment.workspaceId !== workspace.workspaceId) {
          throw new AppError('NOT_FOUND', 'assessment not found', 404);
        }

        if (!assessment.currentDraftVersion) {
          throw new AppError('VALIDATION_ERROR', 'assessment has no active draft version', 400);
        }

        const sections = input.sections.map((s) =>
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

        const looseQuestions = input.looseQuestions.map((q) =>
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

        const rubrics = (input.gradingRubrics ?? []).map((r) =>
          GradingRubric.create({
            id: r.id,
            assessmentId,
            title: r.title,
            criteria:
              r.criteria as unknown as import('../../domain/entities/grading-rubric.entity.js').GradingRubricCriterion[],
          }),
        );

        const rules = (input.gradingRules ?? []).map((r) =>
          GradingRule.create({
            id: r.id,
            assessmentId,
            ...(r.questionId !== undefined ? { questionId: r.questionId } : {}),
            mode: r.mode as unknown as GradingMode,
            ruleType: r.ruleType,
            config: r.config,
          }),
        );

        const newVersion = AssessmentVersion.createDraft({
          id: assessment.currentDraftVersion.id,
          assessmentId,
          versionNumber: assessment.currentDraftVersion.versionNumber,
          sections,
          looseQuestions,
          createdByPrincipalId: workspace.actorId,
          createdAt: new Date(),
        });

        assessment.replaceDraftContent(newVersion);
        assessment.replaceGradingConfiguration(rubrics, rules);

        const saved = await this.repo.save(assessment, tx);

        await this.auditRecorder.record(
          {
            action: 'assessment.content_replaced',
            actorId: workspace.actorId,
            targetType: 'assessment',
            targetId: saved.id,
          },
          context,
          tx,
        );

        await this.eventPublisher.publishDomainEvent(
          createAssessmentContentReplacedEvent(saved.id, saved.tenantId, saved.workspaceId, {
            versionNumber: newVersion.versionNumber,
            questionCount: newVersion.getQuestionCount(),
            sectionCount: newVersion.sections.length,
          }),
          context,
          tx,
        );

        return mapAssessmentToResponse(saved);
      })
      .catch((error) => {
        console.error('[ReplaceAssessmentContentUseCase.execute] failed', error);
        throw error;
      });
  }
}
