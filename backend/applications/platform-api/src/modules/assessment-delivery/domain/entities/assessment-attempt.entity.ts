/**
 * AssessmentAttempt Aggregate Root
 * Represents a learner's attempt at a published assessment snapshot.
 *
 * Rules:
 * - Attempts reference a published snapshot only (not draft)
 * - Only IN_PROGRESS attempts can save answers or submit
 * - Submission converts all draft answers to submitted
 * - Submission creates a result placeholder
 * - Expire/cancel transitions enforced
 * - No ORM imports
 * - No Content Studio / Learning Delivery imports
 * - No grading execution
 * - No proctoring
 * - No code execution
 */

import type { AssessmentAttemptStatus } from '../value-objects/assessment-attempt-status.vo.js';
import { AssessmentAttemptStatusEnum } from '../value-objects/assessment-attempt-status.vo.js';
import { AssessmentAttemptAnswer } from './assessment-attempt-answer.entity.js';
import { AssessmentAttemptSession } from './assessment-attempt-session.entity.js';
import { AssessmentAttemptResult } from './assessment-attempt-result.entity.js';
import type { QuestionKind } from '../value-objects/question-kind.vo.js';

export interface AssessmentAttemptProps {
  id: string;
  tenantId: string;
  workspaceId: string;
  assessmentId: string;
  snapshotId: string;
  snapshotVersionId: string;
  snapshotVersionNumber: number;
  learnerPrincipalId: string;
  status: AssessmentAttemptStatus;
  session: AssessmentAttemptSession;
  answers: AssessmentAttemptAnswer[];
  result?: AssessmentAttemptResult;
  startedAt: Date;
  submittedAt?: Date;
  expiresAt?: Date;
  cancelledAt?: Date;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export class AssessmentAttempt {
  readonly id: string;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly assessmentId: string;
  readonly snapshotId: string;
  readonly snapshotVersionId: string;
  readonly snapshotVersionNumber: number;
  readonly learnerPrincipalId: string;
  status: AssessmentAttemptStatus;
  session: AssessmentAttemptSession;
  answers: AssessmentAttemptAnswer[];
  result?: AssessmentAttemptResult;
  readonly startedAt: Date;
  submittedAt?: Date;
  expiresAt?: Date;
  cancelledAt?: Date;
  metadata: Record<string, unknown>;
  readonly createdAt: Date;
  updatedAt: Date;

  private constructor(props: AssessmentAttemptProps) {
    this.id = props.id;
    this.tenantId = props.tenantId;
    this.workspaceId = props.workspaceId;
    this.assessmentId = props.assessmentId;
    this.snapshotId = props.snapshotId;
    this.snapshotVersionId = props.snapshotVersionId;
    this.snapshotVersionNumber = props.snapshotVersionNumber;
    this.learnerPrincipalId = props.learnerPrincipalId;
    this.status = props.status;
    this.session = props.session;
    this.answers = props.answers;
    if (props.result !== undefined) {
      this.result = props.result;
    }
    this.startedAt = props.startedAt;
    if (props.submittedAt !== undefined) {
      this.submittedAt = props.submittedAt;
    }
    if (props.expiresAt !== undefined) {
      this.expiresAt = props.expiresAt;
    }
    if (props.cancelledAt !== undefined) {
      this.cancelledAt = props.cancelledAt;
    }
    this.metadata = props.metadata;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  /**
   * Start a new attempt from a published snapshot.
   */
  static start(props: {
    id: string;
    tenantId: string;
    workspaceId: string;
    assessmentId: string;
    snapshotId: string;
    snapshotVersionId: string;
    snapshotVersionNumber: number;
    learnerPrincipalId: string;
    sessionId: string;
    startedAt?: Date;
    expiresAt?: Date;
    metadata?: Record<string, unknown>;
  }): AssessmentAttempt {
    if (!props.id || typeof props.id !== 'string') {
      throw new Error('AssessmentAttempt id is required');
    }
    if (!props.tenantId || typeof props.tenantId !== 'string') {
      throw new Error('AssessmentAttempt tenantId is required');
    }
    if (!props.workspaceId || typeof props.workspaceId !== 'string') {
      throw new Error('AssessmentAttempt workspaceId is required');
    }
    if (!props.assessmentId || typeof props.assessmentId !== 'string') {
      throw new Error('AssessmentAttempt assessmentId is required');
    }
    if (!props.snapshotId || typeof props.snapshotId !== 'string') {
      throw new Error('AssessmentAttempt snapshotId is required');
    }
    if (!props.snapshotVersionId || typeof props.snapshotVersionId !== 'string') {
      throw new Error('AssessmentAttempt snapshotVersionId is required');
    }
    if (!props.learnerPrincipalId || typeof props.learnerPrincipalId !== 'string') {
      throw new Error('AssessmentAttempt learnerPrincipalId is required');
    }
    if (!Number.isInteger(props.snapshotVersionNumber) || props.snapshotVersionNumber <= 0) {
      throw new Error('AssessmentAttempt snapshotVersionNumber must be a positive integer');
    }

    const now = props.startedAt ?? new Date();
    const session = AssessmentAttemptSession.create({
      id: props.sessionId,
      attemptId: props.id,
      startedAt: now,
      ...(props.expiresAt !== undefined ? { expiresAt: props.expiresAt } : {}),
    });

    return new AssessmentAttempt({
      id: props.id,
      tenantId: props.tenantId,
      workspaceId: props.workspaceId,
      assessmentId: props.assessmentId,
      snapshotId: props.snapshotId,
      snapshotVersionId: props.snapshotVersionId,
      snapshotVersionNumber: props.snapshotVersionNumber,
      learnerPrincipalId: props.learnerPrincipalId,
      status: AssessmentAttemptStatusEnum.IN_PROGRESS,
      session,
      answers: [],
      startedAt: now,
      ...(props.expiresAt !== undefined ? { expiresAt: props.expiresAt } : {}),
      metadata: props.metadata ? { ...props.metadata } : {},
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(props: AssessmentAttemptProps): AssessmentAttempt {
    return new AssessmentAttempt(props);
  }

  /**
   * Save or update a learner's answer for a question.
   * Only allowed while IN_PROGRESS.
   */
  saveAnswer(props: {
    answerId: string;
    questionId: string;
    questionKind: QuestionKind;
    answer: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }): AssessmentAttemptAnswer {
    if (this.status !== AssessmentAttemptStatusEnum.IN_PROGRESS) {
      throw new Error('Cannot save answer: attempt is not in progress');
    }

    const existing = this.answers.find((a) => a.questionId === props.questionId);
    if (existing) {
      existing.updateAnswer(props.answer);
      if (props.metadata) {
        existing.updateMetadata(props.metadata);
      }
      return existing;
    }

    const answer = AssessmentAttemptAnswer.createDraft({
      id: props.answerId,
      attemptId: this.id,
      questionId: props.questionId,
      questionKind: props.questionKind,
      answer: props.answer,
      ...(props.metadata !== undefined ? { metadata: props.metadata } : {}),
    });

    this.answers = [...this.answers, answer];
    this.updatedAt = new Date();

    return answer;
  }

  /**
   * Submit the attempt.
   * Converts all DRAFT answers to SUBMITTED, creates a result placeholder, and sets submittedAt.
   */
  submit(resultId: string): AssessmentAttemptResult {
    if (this.status !== AssessmentAttemptStatusEnum.IN_PROGRESS) {
      throw new Error('Cannot submit: attempt is not in progress');
    }

    // Submit all draft answers
    for (const answer of this.answers) {
      if (answer.isDraft()) {
        answer.submit();
      }
    }

    const now = new Date();
    this.status = AssessmentAttemptStatusEnum.SUBMITTED;
    this.submittedAt = now;
    this.session.markSubmitted(now);

    // Create result placeholder
    const result =
      this.result ??
      AssessmentAttemptResult.createPlaceholder({
        id: resultId,
        attemptId: this.id,
        createdAt: now,
      });
    this.result = result;
    this.updatedAt = now;

    return result;
  }

  /**
   * Expire the attempt (e.g. time ran out).
   * Only allowed while IN_PROGRESS.
   */
  expire(): void {
    if (this.status !== AssessmentAttemptStatusEnum.IN_PROGRESS) {
      throw new Error('Cannot expire: attempt is not in progress');
    }
    this.status = AssessmentAttemptStatusEnum.EXPIRED;
    this.updatedAt = new Date();
  }

  /**
   * Cancel the attempt.
   * Only allowed from IN_PROGRESS.
   */
  cancel(): void {
    if (
      this.status !== AssessmentAttemptStatusEnum.IN_PROGRESS &&
      this.status !== AssessmentAttemptStatusEnum.NOT_STARTED
    ) {
      throw new Error('Cannot cancel: attempt is already submitted, expired, or cancelled');
    }
    this.status = AssessmentAttemptStatusEnum.CANCELLED;
    this.cancelledAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Touch the session to update lastSeenAt.
   */
  touchSession(now: Date = new Date()): void {
    this.session.touch(now);
    this.updatedAt = new Date();
  }

  /**
   * Attach an already-created result (for restore from persistence).
   */
  attachResult(result: AssessmentAttemptResult): void {
    this.result = result;
    this.updatedAt = new Date();
  }

  releaseResult(input?: {
    releasedAt?: Date;
    feedback?: Record<string, unknown>;
  }): AssessmentAttemptResult {
    if (!this.result) {
      throw new Error('Cannot release result: attempt result missing');
    }
    this.result.release(input);
    this.updatedAt = new Date();
    return this.result;
  }

  /**
   * Update attempt metadata.
   */
  updateMetadata(updates: Record<string, unknown>): void {
    if (typeof updates !== 'object' || updates === null) {
      throw new Error('Metadata updates must be an object');
    }
    this.metadata = { ...this.metadata, ...updates };
    this.updatedAt = new Date();
  }

  isInProgress(): boolean {
    return this.status === AssessmentAttemptStatusEnum.IN_PROGRESS;
  }

  isSubmitted(): boolean {
    return this.status === AssessmentAttemptStatusEnum.SUBMITTED;
  }

  isExpired(): boolean {
    return this.status === AssessmentAttemptStatusEnum.EXPIRED;
  }

  isCancelled(): boolean {
    return this.status === AssessmentAttemptStatusEnum.CANCELLED;
  }

  /**
   * Check if the session has expired based on current time.
   */
  isSessionExpired(now: Date = new Date()): boolean {
    return this.session.isExpired(now);
  }
}
