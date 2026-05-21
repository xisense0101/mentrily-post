/**
 * QuestionPoints Value Object
 * Represents the point value of a question
 */

export class QuestionPoints {
  private readonly _value: number;

  private constructor(value: number) {
    this._value = value;
  }

  /**
   * Create a QuestionPoints value object
   * @param value - Points value (must be >= 0)
   * @throws Error if value is invalid
   */
  static create(value: unknown): QuestionPoints {
    if (typeof value !== 'number') {
      throw new Error('Points must be a number');
    }

    if (!Number.isFinite(value)) {
      throw new Error('Points must be a finite number');
    }

    if (value < 0) {
      throw new Error('Points must be >= 0');
    }

    // Optional: enforce reasonable upper bound
    const MAX_REASONABLE_POINTS = 1000;
    if (value > MAX_REASONABLE_POINTS) {
      throw new Error(`Points must be <= ${MAX_REASONABLE_POINTS}`);
    }

    return new QuestionPoints(value);
  }

  /**
   * Get the numeric value
   */
  value(): number {
    return this._value;
  }

  /**
   * Check equality with another QuestionPoints
   */
  equals(other: QuestionPoints): boolean {
    return this._value === other._value;
  }

  /**
   * Convert to string representation
   */
  toString(): string {
    return `${this._value}`;
  }

  /**
   * Convert to JSON
   */
  toJSON(): number {
    return this._value;
  }
}
