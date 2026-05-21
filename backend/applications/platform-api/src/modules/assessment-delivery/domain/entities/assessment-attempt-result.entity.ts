/**
 * AssessmentAttemptResult Entity
 * Placeholder result record created at submission time.
 * Grading worker/execution are NOT implemented here.
 * Only the result lifecycle placeholder is modeled.
 */

import type { AssessmentAttemptGradingStatus } from '../value-objects/assessment-attempt-grading-status.vo.js';
import { AssessmentAttemptGradingStatusEnum } from '../value-objects/assessment-attempt-grading-status.vo.js';
import { AssessmentAttemptScore } from '../value-objects/assessment-attempt-score.vo.js';

export interface AssessmentAttemptResultProps {
  id: string;
  attemptId: string;
  gradingStatus: AssessmentAttemptGradingStatus;
  score?: AssessmentAttemptScore;
  maxScore?: AssessmentAttemptScore;
  releasedAt?: Date;
  feedback?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export class AssessmentAttemptResult {
  readonly id: string;
  readonly attemptId: string;
  gradingStatus: AssessmentAttemptGradingStatus;
  score?: AssessmentAttemptScore;
  maxScore?: AssessmentAttemptScore;
  releasedAt?: Date;
  feedback?: Record<string, unknown>;
  readonly createdAt: Date;
  updatedAt: Date;

  private constructor(props: AssessmentAttemptResultProps) {
    this.id = props.id;
    this.attemptId = props.attemptId;
    this.gradingStatus = props.gradingStatus;
    if (props.score !== undefined) {
      this.score = props.score;
    }
    if (props.maxScore !== undefined) {
      this.maxScore = props.maxScore;
    }
    if (props.releasedAt !== undefined) {
      this.releasedAt = props.releasedAt;
    }
    if (props.feedback !== undefined) {
      this.feedback = props.feedback;
    }
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static createPlaceholder(props: {
    id: string;
    attemptId: string;
    createdAt?: Date;
  }): AssessmentAttemptResult {
    if (!props.id || typeof props.id !== 'string') {
      throw new Error('AssessmentAttemptResult id is required');
    }
    if (!props.attemptId || typeof props.attemptId !== 'string') {
      throw new Error('AssessmentAttemptResult attemptId is required');
    }
    const now = props.createdAt ?? new Date();
    return new AssessmentAttemptResult({
      id: props.id,
      attemptId: props.attemptId,
      gradingStatus: AssessmentAttemptGradingStatusEnum.NOT_GRADED,
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(props: AssessmentAttemptResultProps): AssessmentAttemptResult {
    return new AssessmentAttemptResult(props);
  }

  /**
   * Mark as reserved for auto grading (reserved — no grading execution in this task)
   */
  markAutoGradingReserved(): void {
    this.gradingStatus = AssessmentAttemptGradingStatusEnum.AUTO_GRADING_RESERVED;
    this.updatedAt = new Date();
  }

  /**
   * Mark as pending manual review (reserved — no grading queue in this task)
   */
  markPendingManualReview(): void {
    this.gradingStatus = AssessmentAttemptGradingStatusEnum.PENDING_MANUAL_REVIEW;
    this.updatedAt = new Date();
  }

  /**
   * Mark as graded (reserved — no scoring engine in this task)
   */
  markGraded(score: AssessmentAttemptScore, maxScore: AssessmentAttemptScore): void {
    this.gradingStatus = AssessmentAttemptGradingStatusEnum.GRADED;
    this.score = score;
    this.maxScore = maxScore;
    this.updatedAt = new Date();
  }

  clearRelease(): void {
    delete this.releasedAt;
    this.updatedAt = new Date();
  }

  /**
   * Release the result to the learner.
   * Requires graded status.
   */
  release(input?: { releasedAt?: Date; feedback?: Record<string, unknown> }): void {
    if (this.gradingStatus !== AssessmentAttemptGradingStatusEnum.GRADED) {
      throw new Error('Cannot release a result that is not graded');
    }
    if (this.releasedAt !== undefined) {
      throw new Error('Cannot release a result that is already released');
    }
    this.gradingStatus = AssessmentAttemptGradingStatusEnum.RELEASED;
    if (input?.feedback !== undefined) {
      this.feedback = { ...input.feedback };
    }
    this.releasedAt = input?.releasedAt ?? new Date();
    this.updatedAt = this.releasedAt;
  }

  isReleased(): boolean {
    return this.gradingStatus === AssessmentAttemptGradingStatusEnum.RELEASED;
  }

  isGraded(): boolean {
    return this.gradingStatus === AssessmentAttemptGradingStatusEnum.GRADED;
  }

  isNotGraded(): boolean {
    return this.gradingStatus === AssessmentAttemptGradingStatusEnum.NOT_GRADED;
  }
}
