import type { QuestionKind } from '../value-objects/question-kind.vo.js';
import {
  AssessmentAnswerGradeStatusEnum,
  type AssessmentAnswerGradeStatus,
} from '../value-objects/assessment-answer-grade-status.vo.js';
import {
  AssessmentGradingMethodEnum,
  type AssessmentGradingMethod,
} from '../value-objects/assessment-grading-method.vo.js';
import { AssessmentGradeScore } from '../value-objects/assessment-grade-score.vo.js';

export interface AssessmentAnswerGradeProps {
  id: string;
  attemptId: string;
  answerId: string;
  questionId: string;
  questionKind: QuestionKind;
  status: AssessmentAnswerGradeStatus;
  method: AssessmentGradingMethod;
  score?: AssessmentGradeScore;
  maxScore: AssessmentGradeScore;
  feedback?: Record<string, unknown>;
  gradedByPrincipalId?: string;
  gradedAt?: Date;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export class AssessmentAnswerGrade {
  readonly id: string;
  readonly attemptId: string;
  readonly answerId: string;
  readonly questionId: string;
  readonly questionKind: QuestionKind;
  status: AssessmentAnswerGradeStatus;
  method: AssessmentGradingMethod;
  score?: AssessmentGradeScore;
  maxScore: AssessmentGradeScore;
  feedback?: Record<string, unknown>;
  gradedByPrincipalId?: string;
  gradedAt?: Date;
  metadata: Record<string, unknown>;
  readonly createdAt: Date;
  updatedAt: Date;

  private constructor(props: AssessmentAnswerGradeProps) {
    this.id = props.id;
    this.attemptId = props.attemptId;
    this.answerId = props.answerId;
    this.questionId = props.questionId;
    this.questionKind = props.questionKind;
    this.status = props.status;
    this.method = props.method;
    if (props.score !== undefined) {
      this.score = props.score;
    }
    this.maxScore = props.maxScore;
    if (props.feedback !== undefined) {
      this.feedback = { ...props.feedback };
    }
    if (props.gradedByPrincipalId !== undefined) {
      this.gradedByPrincipalId = props.gradedByPrincipalId;
    }
    if (props.gradedAt !== undefined) {
      this.gradedAt = props.gradedAt;
    }
    this.metadata = { ...props.metadata };
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static createNotGraded(props: {
    id: string;
    attemptId: string;
    answerId: string;
    questionId: string;
    questionKind: QuestionKind;
    maxScore: AssessmentGradeScore;
    metadata?: Record<string, unknown>;
    createdAt?: Date;
  }): AssessmentAnswerGrade {
    AssessmentAnswerGrade.assertRequired(props);
    const now = props.createdAt ?? new Date();
    return new AssessmentAnswerGrade({
      id: props.id,
      attemptId: props.attemptId,
      answerId: props.answerId,
      questionId: props.questionId,
      questionKind: props.questionKind,
      status: AssessmentAnswerGradeStatusEnum.NOT_GRADED,
      method: AssessmentGradingMethodEnum.MANUAL_REVIEW,
      maxScore: props.maxScore,
      metadata: props.metadata ? { ...props.metadata } : {},
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(props: AssessmentAnswerGradeProps): AssessmentAnswerGrade {
    AssessmentAnswerGrade.assertRequired(props);
    if (props.score !== undefined && props.score.value > props.maxScore.value) {
      throw new Error('AssessmentAnswerGrade score cannot exceed maxScore');
    }
    return new AssessmentAnswerGrade(props);
  }

  markAutoGraded(
    score: AssessmentGradeScore,
    feedback?: Record<string, unknown>,
    metadata?: Record<string, unknown>,
  ): void {
    this.status = AssessmentAnswerGradeStatusEnum.AUTO_GRADED;
    this.method = AssessmentGradingMethodEnum.AUTO_RULE;
    this.score = AssessmentGradeScore.create(score.value, this.maxScore);
    this.gradedAt = new Date();
    delete this.gradedByPrincipalId;
    this.updateOptionalRecords(feedback, metadata);
  }

  markPendingManualReview(
    metadata?: Record<string, unknown>,
    feedback?: Record<string, unknown>,
  ): void {
    this.status = AssessmentAnswerGradeStatusEnum.PENDING_MANUAL_REVIEW;
    this.method = AssessmentGradingMethodEnum.MANUAL_REVIEW;
    delete this.score;
    delete this.gradedByPrincipalId;
    delete this.gradedAt;
    this.updateOptionalRecords(feedback, metadata);
  }

  markManuallyGraded(
    score: AssessmentGradeScore,
    gradedByPrincipalId: string,
    feedback?: Record<string, unknown>,
    metadata?: Record<string, unknown>,
  ): void {
    if (!gradedByPrincipalId) {
      throw new Error('Manual grade requires grader principal ID');
    }
    this.status = AssessmentAnswerGradeStatusEnum.MANUALLY_GRADED;
    this.method = AssessmentGradingMethodEnum.MANUAL_REVIEW;
    this.score = AssessmentGradeScore.create(score.value, this.maxScore);
    this.gradedByPrincipalId = gradedByPrincipalId;
    this.gradedAt = new Date();
    this.updateOptionalRecords(feedback, metadata);
  }

  markSkipped(feedback?: Record<string, unknown>, metadata?: Record<string, unknown>): void {
    this.status = AssessmentAnswerGradeStatusEnum.GRADING_SKIPPED;
    delete this.score;
    delete this.gradedByPrincipalId;
    delete this.gradedAt;
    this.updateOptionalRecords(feedback, metadata);
  }

  markFailed(feedback?: Record<string, unknown>, metadata?: Record<string, unknown>): void {
    this.status = AssessmentAnswerGradeStatusEnum.GRADING_FAILED;
    delete this.score;
    delete this.gradedByPrincipalId;
    delete this.gradedAt;
    this.updateOptionalRecords(feedback, metadata);
  }

  updateFeedback(feedback?: Record<string, unknown>): void {
    if (feedback === undefined) {
      delete this.feedback;
    } else {
      this.feedback = { ...feedback };
    }
    this.updatedAt = new Date();
  }

  private updateOptionalRecords(
    feedback?: Record<string, unknown>,
    metadata?: Record<string, unknown>,
  ): void {
    if (feedback === undefined) {
      delete this.feedback;
    } else {
      this.feedback = { ...feedback };
    }
    if (metadata === undefined) {
      this.metadata = { ...this.metadata };
    } else {
      this.metadata = { ...this.metadata, ...metadata };
    }
    this.updatedAt = new Date();
  }

  private static assertRequired(props: {
    id: string;
    attemptId: string;
    answerId: string;
    questionId: string;
    questionKind: QuestionKind;
    maxScore: AssessmentGradeScore;
  }): void {
    if (!props.id) {
      throw new Error('AssessmentAnswerGrade id is required');
    }
    if (!props.attemptId) {
      throw new Error('AssessmentAnswerGrade attemptId is required');
    }
    if (!props.answerId) {
      throw new Error('AssessmentAnswerGrade answerId is required');
    }
    if (!props.questionId) {
      throw new Error('AssessmentAnswerGrade questionId is required');
    }
    if (!props.questionKind) {
      throw new Error('AssessmentAnswerGrade questionKind is required');
    }
    if (!(props.maxScore instanceof AssessmentGradeScore)) {
      throw new Error('AssessmentAnswerGrade maxScore is required');
    }
  }
}
