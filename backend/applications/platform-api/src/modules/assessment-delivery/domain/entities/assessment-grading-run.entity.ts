import { AssessmentAnswerGrade } from './assessment-answer-grade.entity.js';
import {
  AssessmentGradingRunStatusEnum,
  type AssessmentGradingRunStatus,
} from '../value-objects/assessment-grading-run-status.vo.js';
import { AssessmentGradeScore } from '../value-objects/assessment-grade-score.vo.js';

export interface AssessmentGradingRunProps {
  id: string;
  tenantId: string;
  workspaceId: string;
  attemptId: string;
  assessmentId: string;
  snapshotId: string;
  triggeredByPrincipalId?: string;
  status: AssessmentGradingRunStatus;
  startedAt: Date;
  completedAt?: Date;
  failedAt?: Date;
  error?: string;
  answerGrades: AssessmentAnswerGrade[];
  totalScore?: AssessmentGradeScore;
  maxScore?: AssessmentGradeScore;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export class AssessmentGradingRun {
  readonly id: string;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly attemptId: string;
  readonly assessmentId: string;
  readonly snapshotId: string;
  triggeredByPrincipalId?: string;
  status: AssessmentGradingRunStatus;
  readonly startedAt: Date;
  completedAt?: Date;
  failedAt?: Date;
  error?: string;
  answerGrades: AssessmentAnswerGrade[];
  totalScore?: AssessmentGradeScore;
  maxScore?: AssessmentGradeScore;
  metadata: Record<string, unknown>;
  readonly createdAt: Date;
  updatedAt: Date;

  private constructor(props: AssessmentGradingRunProps) {
    this.id = props.id;
    this.tenantId = props.tenantId;
    this.workspaceId = props.workspaceId;
    this.attemptId = props.attemptId;
    this.assessmentId = props.assessmentId;
    this.snapshotId = props.snapshotId;
    if (props.triggeredByPrincipalId !== undefined) {
      this.triggeredByPrincipalId = props.triggeredByPrincipalId;
    }
    this.status = props.status;
    this.startedAt = props.startedAt;
    if (props.completedAt !== undefined) {
      this.completedAt = props.completedAt;
    }
    if (props.failedAt !== undefined) {
      this.failedAt = props.failedAt;
    }
    if (props.error !== undefined) {
      this.error = props.error;
    }
    this.answerGrades = [...props.answerGrades];
    if (props.totalScore !== undefined) {
      this.totalScore = props.totalScore;
    }
    if (props.maxScore !== undefined) {
      this.maxScore = props.maxScore;
    }
    this.metadata = { ...props.metadata };
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static start(props: {
    id: string;
    tenantId: string;
    workspaceId: string;
    attemptId: string;
    assessmentId: string;
    snapshotId: string;
    triggeredByPrincipalId?: string;
    startedAt?: Date;
    metadata?: Record<string, unknown>;
  }): AssessmentGradingRun {
    if (
      !props.id ||
      !props.tenantId ||
      !props.workspaceId ||
      !props.attemptId ||
      !props.assessmentId ||
      !props.snapshotId
    ) {
      throw new Error(
        'AssessmentGradingRun requires id, tenantId, workspaceId, attemptId, assessmentId, snapshotId',
      );
    }
    const now = props.startedAt ?? new Date();
    return new AssessmentGradingRun({
      id: props.id,
      tenantId: props.tenantId,
      workspaceId: props.workspaceId,
      attemptId: props.attemptId,
      assessmentId: props.assessmentId,
      snapshotId: props.snapshotId,
      ...(props.triggeredByPrincipalId !== undefined
        ? { triggeredByPrincipalId: props.triggeredByPrincipalId }
        : {}),
      status: AssessmentGradingRunStatusEnum.RUNNING,
      startedAt: now,
      answerGrades: [],
      metadata: props.metadata ? { ...props.metadata } : {},
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(props: AssessmentGradingRunProps): AssessmentGradingRun {
    return new AssessmentGradingRun(props);
  }

  addAnswerGrade(answerGrade: AssessmentAnswerGrade): void {
    this.answerGrades = [
      ...this.answerGrades.filter((grade) => grade.answerId !== answerGrade.answerId),
      answerGrade,
    ].sort((left, right) => {
      const byQuestion = left.questionId.localeCompare(right.questionId);
      if (byQuestion !== 0) {
        return byQuestion;
      }
      return left.answerId.localeCompare(right.answerId);
    });
    this.updatedAt = new Date();
  }

  calculateTotals(): { totalScore: AssessmentGradeScore; maxScore: AssessmentGradeScore } {
    const total = this.answerGrades.reduce((sum, grade) => sum + (grade.score?.value ?? 0), 0);
    const max = this.answerGrades.reduce((sum, grade) => sum + grade.maxScore.value, 0);
    const totalScore = AssessmentGradeScore.create(total);
    const maxScore = AssessmentGradeScore.create(max);
    this.totalScore = totalScore;
    this.maxScore = maxScore;
    this.updatedAt = new Date();
    return { totalScore, maxScore };
  }

  markCompleted(): void {
    this.calculateTotals();
    this.status = AssessmentGradingRunStatusEnum.COMPLETED;
    this.completedAt = new Date();
    delete this.failedAt;
    delete this.error;
    this.updatedAt = new Date();
  }

  markPartial(): void {
    this.calculateTotals();
    this.status = AssessmentGradingRunStatusEnum.PARTIAL;
    this.completedAt = new Date();
    delete this.failedAt;
    delete this.error;
    this.updatedAt = new Date();
  }

  markFailed(error: string): void {
    if (!error) {
      throw new Error('AssessmentGradingRun failure error is required');
    }
    this.status = AssessmentGradingRunStatusEnum.FAILED;
    this.failedAt = new Date();
    this.error = error;
    delete this.completedAt;
    this.updatedAt = new Date();
  }
}
