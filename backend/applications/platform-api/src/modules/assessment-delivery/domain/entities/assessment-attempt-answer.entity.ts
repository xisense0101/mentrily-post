/**
 * AssessmentAttemptAnswer Entity
 * Represents a learner's answer to a single question within an attempt
 *
 * Answer payload conventions:
 * - MCQ:             { selectedOptionId: string }
 * - MULTI_SELECT:    { selectedOptionIds: string[] }
 * - TRUE_FALSE:      { value: boolean }
 * - SHORT_ANSWER:    { text: string }
 * - LONG_ANSWER:     { text: string }
 * - CODE:            { sourceCode: string; language?: string }
 * - NOTEBOOK:        { notebookJson: unknown }
 * - FILE_UPLOAD:     { fileIds: string[] }
 * - RUBRIC_ONLY:     {}
 * - READING_PASSAGE: {}
 *
 * No correctness evaluation in this entity.
 */

import type { AssessmentAttemptAnswerStatus } from '../value-objects/assessment-attempt-answer-status.vo.js';
import { AssessmentAttemptAnswerStatusEnum } from '../value-objects/assessment-attempt-answer-status.vo.js';
import type { QuestionKind } from '../value-objects/question-kind.vo.js';

export interface AssessmentAttemptAnswerProps {
  id: string;
  attemptId: string;
  questionId: string;
  questionKind: QuestionKind;
  answer: Record<string, unknown>;
  status: AssessmentAttemptAnswerStatus;
  savedAt: Date;
  submittedAt?: Date;
  metadata: Record<string, unknown>;
}

export class AssessmentAttemptAnswer {
  readonly id: string;
  readonly attemptId: string;
  readonly questionId: string;
  readonly questionKind: QuestionKind;
  answer: Record<string, unknown>;
  status: AssessmentAttemptAnswerStatus;
  savedAt: Date;
  submittedAt?: Date;
  metadata: Record<string, unknown>;

  private constructor(props: AssessmentAttemptAnswerProps) {
    this.id = props.id;
    this.attemptId = props.attemptId;
    this.questionId = props.questionId;
    this.questionKind = props.questionKind;
    this.answer = props.answer;
    this.status = props.status;
    this.savedAt = props.savedAt;
    if (props.submittedAt !== undefined) {
      this.submittedAt = props.submittedAt;
    }
    this.metadata = props.metadata;
  }

  static createDraft(props: {
    id: string;
    attemptId: string;
    questionId: string;
    questionKind: QuestionKind;
    answer: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }): AssessmentAttemptAnswer {
    if (!props.id || typeof props.id !== 'string') {
      throw new Error('AssessmentAttemptAnswer id is required');
    }
    if (!props.attemptId || typeof props.attemptId !== 'string') {
      throw new Error('AssessmentAttemptAnswer attemptId is required');
    }
    if (!props.questionId || typeof props.questionId !== 'string') {
      throw new Error('AssessmentAttemptAnswer questionId is required');
    }
    if (!props.questionKind || typeof props.questionKind !== 'string') {
      throw new Error('AssessmentAttemptAnswer questionKind is required');
    }
    if (typeof props.answer !== 'object' || props.answer === null || Array.isArray(props.answer)) {
      throw new Error('AssessmentAttemptAnswer answer must be an object');
    }
    return new AssessmentAttemptAnswer({
      id: props.id,
      attemptId: props.attemptId,
      questionId: props.questionId,
      questionKind: props.questionKind,
      answer: { ...props.answer },
      status: AssessmentAttemptAnswerStatusEnum.DRAFT,
      savedAt: new Date(),
      metadata: props.metadata ? { ...props.metadata } : {},
    });
  }

  static restore(props: AssessmentAttemptAnswerProps): AssessmentAttemptAnswer {
    return new AssessmentAttemptAnswer(props);
  }

  /**
   * Update the answer payload. Only allowed while DRAFT.
   */
  updateAnswer(newAnswer: Record<string, unknown>): void {
    if (this.status !== AssessmentAttemptAnswerStatusEnum.DRAFT) {
      throw new Error('Cannot update a submitted answer');
    }
    if (typeof newAnswer !== 'object' || newAnswer === null || Array.isArray(newAnswer)) {
      throw new Error('Answer must be an object');
    }
    this.answer = { ...newAnswer };
    this.savedAt = new Date();
  }

  /**
   * Submit this answer. Transitions status to SUBMITTED.
   */
  submit(): void {
    if (this.status !== AssessmentAttemptAnswerStatusEnum.DRAFT) {
      throw new Error('Answer is already submitted');
    }
    this.status = AssessmentAttemptAnswerStatusEnum.SUBMITTED;
    this.submittedAt = new Date();
  }

  /**
   * Update metadata. Safe for both DRAFT and SUBMITTED.
   */
  updateMetadata(updates: Record<string, unknown>): void {
    if (typeof updates !== 'object' || updates === null) {
      throw new Error('Metadata updates must be an object');
    }
    this.metadata = { ...this.metadata, ...updates };
  }

  isDraft(): boolean {
    return this.status === AssessmentAttemptAnswerStatusEnum.DRAFT;
  }

  isSubmitted(): boolean {
    return this.status === AssessmentAttemptAnswerStatusEnum.SUBMITTED;
  }
}
