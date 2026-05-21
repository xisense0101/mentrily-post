/**
 * QuestionAnswerKey Value Object
 * Represents the correct answer(s) for a question
 * Supports various question types with different answer key formats
 */

export interface QuestionAnswerKeyProps {
  correctOptionIds?: string[];
  acceptedTextAnswers?: string[];
  expectedOutput?: string;
  rubricId?: string;
  metadata?: Record<string, unknown>;
}

export class QuestionAnswerKey {
  readonly correctOptionIds?: string[];
  readonly acceptedTextAnswers?: string[];
  readonly expectedOutput?: string;
  readonly rubricId?: string;
  readonly metadata?: Record<string, unknown>;

  private constructor(props: QuestionAnswerKeyProps) {
    if (props.correctOptionIds !== undefined) {
      this.correctOptionIds = props.correctOptionIds;
    }
    if (props.acceptedTextAnswers !== undefined) {
      this.acceptedTextAnswers = props.acceptedTextAnswers;
    }
    if (props.expectedOutput !== undefined) {
      this.expectedOutput = props.expectedOutput;
    }
    if (props.rubricId !== undefined) {
      this.rubricId = props.rubricId;
    }
    if (props.metadata !== undefined) {
      this.metadata = props.metadata;
    }
  }

  /**
   * Create a QuestionAnswerKey value object
   * @throws Error if the object shape is invalid
   */
  static create(props: QuestionAnswerKeyProps): QuestionAnswerKey {
    // Validate that at least one answer key type is provided
    const hasAnswerData =
      (props.correctOptionIds && props.correctOptionIds.length > 0) ||
      (props.acceptedTextAnswers && props.acceptedTextAnswers.length > 0) ||
      props.expectedOutput ||
      props.rubricId;

    if (!hasAnswerData) {
      throw new Error('Answer key must include at least one answer specification');
    }

    // Validate correctOptionIds
    if (props.correctOptionIds) {
      if (!Array.isArray(props.correctOptionIds)) {
        throw new Error('correctOptionIds must be an array');
      }
      if (!props.correctOptionIds.every((id) => typeof id === 'string' && id.length > 0)) {
        throw new Error('correctOptionIds must contain non-empty strings');
      }
    }

    // Validate acceptedTextAnswers
    if (props.acceptedTextAnswers) {
      if (!Array.isArray(props.acceptedTextAnswers)) {
        throw new Error('acceptedTextAnswers must be an array');
      }
      if (!props.acceptedTextAnswers.every((answer) => typeof answer === 'string')) {
        throw new Error('acceptedTextAnswers must contain only strings');
      }
    }

    // Validate expectedOutput
    if (props.expectedOutput !== undefined && typeof props.expectedOutput !== 'string') {
      throw new Error('expectedOutput must be a string');
    }

    // Validate rubricId
    if (props.rubricId !== undefined && typeof props.rubricId !== 'string') {
      throw new Error('rubricId must be a string');
    }

    // Validate metadata
    if (props.metadata !== undefined && typeof props.metadata !== 'object') {
      throw new Error('metadata must be an object');
    }

    return new QuestionAnswerKey(props);
  }

  /**
   * Check if this answer key has option-based answers
   */
  hasOptionAnswers(): boolean {
    return (this.correctOptionIds && this.correctOptionIds.length > 0) || false;
  }

  /**
   * Check if this answer key has text-based answers
   */
  hasTextAnswers(): boolean {
    return (this.acceptedTextAnswers && this.acceptedTextAnswers.length > 0) || false;
  }

  /**
   * Check if this answer key has code/output answers
   */
  hasCodeOutput(): boolean {
    return !!this.expectedOutput;
  }

  /**
   * Check if this answer key uses a rubric
   */
  usesRubric(): boolean {
    return !!this.rubricId;
  }

  /**
   * Convert to plain object
   */
  toObject(): QuestionAnswerKeyProps {
    return {
      ...(this.correctOptionIds !== undefined && { correctOptionIds: this.correctOptionIds }),
      ...(this.acceptedTextAnswers !== undefined && {
        acceptedTextAnswers: this.acceptedTextAnswers,
      }),
      ...(this.expectedOutput !== undefined && { expectedOutput: this.expectedOutput }),
      ...(this.rubricId !== undefined && { rubricId: this.rubricId }),
      ...(this.metadata !== undefined && { metadata: this.metadata }),
    };
  }
}
