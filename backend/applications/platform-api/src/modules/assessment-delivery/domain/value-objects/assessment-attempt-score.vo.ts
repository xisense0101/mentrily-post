/**
 * AssessmentAttemptScore Value Object
 * Represents a numeric score for an assessment attempt result
 * Validates non-negative, finite numeric values
 */

export class AssessmentAttemptScore {
  readonly value: number;

  private constructor(value: number) {
    this.value = value;
  }

  static create(value: number): AssessmentAttemptScore {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new Error('Score must be a finite number');
    }
    if (value < 0) {
      throw new Error('Score must be non-negative');
    }
    return new AssessmentAttemptScore(value);
  }

  equals(other: AssessmentAttemptScore): boolean {
    return this.value === other.value;
  }

  toJSON(): number {
    return this.value;
  }
}
