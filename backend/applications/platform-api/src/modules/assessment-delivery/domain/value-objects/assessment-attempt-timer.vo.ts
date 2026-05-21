/**
 * AssessmentAttemptTimer Value Object
 * Encapsulates timer calculation logic for timed assessment attempts
 */

export class AssessmentAttemptTimer {
  private constructor(readonly timeLimitMinutes: number | undefined) {}

  static create(timeLimitMinutes?: number): AssessmentAttemptTimer {
    if (timeLimitMinutes !== undefined) {
      if (!Number.isInteger(timeLimitMinutes) || timeLimitMinutes <= 0) {
        throw new Error('timeLimitMinutes must be a positive integer');
      }
    }
    return new AssessmentAttemptTimer(timeLimitMinutes);
  }

  static untimed(): AssessmentAttemptTimer {
    return new AssessmentAttemptTimer(undefined);
  }

  isTimed(): boolean {
    return this.timeLimitMinutes !== undefined;
  }

  /**
   * Calculate the expiration date for an attempt that starts at the given time.
   * Returns undefined for untimed attempts.
   */
  calculateExpiresAt(startedAt: Date): Date | undefined {
    if (this.timeLimitMinutes === undefined) {
      return undefined;
    }
    return new Date(startedAt.getTime() + this.timeLimitMinutes * 60 * 1000);
  }

  toJSON(): number | null {
    return this.timeLimitMinutes ?? null;
  }
}
