/**
 * TimeLimit Value Object
 * Represents a time limit for an assessment, in minutes
 */

export class TimeLimit {
  private readonly _minutes?: number;

  private constructor(minutes: number | undefined) {
    if (minutes !== undefined) {
      this._minutes = minutes;
    }
  }

  /**
   * Create a TimeLimit value object
   * @param minutes - Time limit in minutes, or undefined for untimed
   * @throws Error if validation fails
   */
  static create(minutes?: unknown): TimeLimit {
    if (minutes === undefined || minutes === null) {
      return new TimeLimit(undefined);
    }

    if (!Number.isInteger(minutes)) {
      throw new Error('Time limit must be an integer number of minutes');
    }

    if ((minutes as number) <= 0) {
      throw new Error('Time limit must be a positive integer');
    }

    return new TimeLimit(minutes as number);
  }

  /**
   * Create untimed assessment (no time limit)
   */
  static untimed(): TimeLimit {
    return new TimeLimit(undefined);
  }

  /**
   * Check if assessment is timed
   */
  isTimed(): boolean {
    return this._minutes !== undefined;
  }

  /**
   * Get time limit in minutes
   * @returns minutes or undefined if untimed
   */
  minutes(): number | undefined {
    return this._minutes;
  }

  /**
   * Convert time limit to seconds
   */
  seconds(): number | undefined {
    return this._minutes ? this._minutes * 60 : undefined;
  }

  /**
   * Check equality with another TimeLimit
   */
  equals(other: TimeLimit): boolean {
    return this._minutes === other._minutes;
  }

  /**
   * Convert to plain object
   */
  toJSON(): number | undefined {
    return this._minutes;
  }

  /**
   * String representation
   */
  toString(): string {
    return this._minutes ? `${this._minutes} minutes` : 'untimed';
  }
}
