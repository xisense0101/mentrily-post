/**
 * AttemptPolicy Value Object
 * Represents rules for how learners can attempt an assessment
 */

export interface AttemptPolicyProps {
  maxAttempts?: number;
  allowRetake: boolean;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
}

export class AttemptPolicy {
  readonly maxAttempts?: number;
  readonly allowRetake: boolean;
  readonly shuffleQuestions: boolean;
  readonly shuffleOptions: boolean;

  private constructor(props: AttemptPolicyProps) {
    if (props.maxAttempts !== undefined) {
      this.maxAttempts = props.maxAttempts;
    }
    this.allowRetake = props.allowRetake;
    this.shuffleQuestions = props.shuffleQuestions;
    this.shuffleOptions = props.shuffleOptions;
  }

  /**
   * Create an AttemptPolicy value object
   * @throws Error if validation fails
   */
  static create(props: AttemptPolicyProps): AttemptPolicy {
    if (typeof props.allowRetake !== 'boolean') {
      throw new Error('allowRetake must be a boolean');
    }

    if (typeof props.shuffleQuestions !== 'boolean') {
      throw new Error('shuffleQuestions must be a boolean');
    }

    if (typeof props.shuffleOptions !== 'boolean') {
      throw new Error('shuffleOptions must be a boolean');
    }

    // Validate maxAttempts
    if (props.maxAttempts !== undefined) {
      if (!Number.isInteger(props.maxAttempts)) {
        throw new Error('maxAttempts must be an integer');
      }

      if (props.maxAttempts <= 0) {
        throw new Error('maxAttempts must be a positive integer');
      }
    }

    // Normalize/validate incompatible combinations
    // If allowRetake is false and maxAttempts > 1, the rule is contradictory
    if (!props.allowRetake && props.maxAttempts && props.maxAttempts > 1) {
      throw new Error('Cannot have maxAttempts > 1 when allowRetake is false');
    }

    return new AttemptPolicy(props);
  }

  /**
   * Check if learner can attempt multiple times
   */
  canAttemptMultiple(): boolean {
    return this.allowRetake && (!this.maxAttempts || this.maxAttempts > 1);
  }

  /**
   * Get effective attempt limit (null = unlimited)
   */
  getAttemptLimit(): number | null {
    return this.maxAttempts ?? null;
  }

  /**
   * Convert to plain object
   */
  toObject(): AttemptPolicyProps {
    return {
      ...(this.maxAttempts !== undefined && { maxAttempts: this.maxAttempts }),
      allowRetake: this.allowRetake,
      shuffleQuestions: this.shuffleQuestions,
      shuffleOptions: this.shuffleOptions,
    };
  }

  /**
   * Check equality with another AttemptPolicy
   */
  equals(other: AttemptPolicy): boolean {
    return (
      this.maxAttempts === other.maxAttempts &&
      this.allowRetake === other.allowRetake &&
      this.shuffleQuestions === other.shuffleQuestions &&
      this.shuffleOptions === other.shuffleOptions
    );
  }
}
