/**
 * AssessmentAttemptSession Entity
 * Represents a learner's session window during an attempt
 * Tracks timestamps and expiry state
 */

export interface AssessmentAttemptSessionProps {
  id: string;
  attemptId: string;
  startedAt: Date;
  lastSeenAt: Date;
  expiresAt?: Date;
  submittedAt?: Date;
  metadata: Record<string, unknown>;
}

export class AssessmentAttemptSession {
  readonly id: string;
  readonly attemptId: string;
  readonly startedAt: Date;
  lastSeenAt: Date;
  expiresAt?: Date;
  submittedAt?: Date;
  metadata: Record<string, unknown>;

  private constructor(props: AssessmentAttemptSessionProps) {
    this.id = props.id;
    this.attemptId = props.attemptId;
    this.startedAt = props.startedAt;
    this.lastSeenAt = props.lastSeenAt;
    if (props.expiresAt !== undefined) {
      this.expiresAt = props.expiresAt;
    }
    if (props.submittedAt !== undefined) {
      this.submittedAt = props.submittedAt;
    }
    this.metadata = props.metadata;
  }

  static create(props: {
    id: string;
    attemptId: string;
    startedAt?: Date;
    expiresAt?: Date;
    metadata?: Record<string, unknown>;
  }): AssessmentAttemptSession {
    if (!props.id || typeof props.id !== 'string') {
      throw new Error('AssessmentAttemptSession id is required');
    }
    if (!props.attemptId || typeof props.attemptId !== 'string') {
      throw new Error('AssessmentAttemptSession attemptId is required');
    }
    const now = props.startedAt ?? new Date();
    return new AssessmentAttemptSession({
      id: props.id,
      attemptId: props.attemptId,
      startedAt: now,
      lastSeenAt: now,
      ...(props.expiresAt !== undefined ? { expiresAt: props.expiresAt } : {}),
      metadata: props.metadata ? { ...props.metadata } : {},
    });
  }

  static restore(props: AssessmentAttemptSessionProps): AssessmentAttemptSession {
    return new AssessmentAttemptSession(props);
  }

  /**
   * Update the last seen timestamp.
   * Cannot move lastSeenAt backward.
   */
  touch(now: Date = new Date()): void {
    if (now < this.lastSeenAt) {
      return;
    }
    this.lastSeenAt = now;
  }

  /**
   * Mark this session as submitted.
   */
  markSubmitted(submittedAt: Date = new Date()): void {
    this.submittedAt = submittedAt;
  }

  /**
   * Check if this session has expired.
   * Returns true when expiresAt is set and now >= expiresAt.
   */
  isExpired(now: Date = new Date()): boolean {
    if (this.expiresAt === undefined) {
      return false;
    }
    return now >= this.expiresAt;
  }
}
