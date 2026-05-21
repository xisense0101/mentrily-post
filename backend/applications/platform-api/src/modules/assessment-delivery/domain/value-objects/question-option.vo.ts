/**
 * QuestionOption Value Object
 * Represents a single option/choice in a multiple-choice question
 */

export interface QuestionOptionProps {
  id: string;
  label: string;
  value: string;
  isCorrect?: boolean;
  explanation?: string;
}

export class QuestionOption {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly isCorrect?: boolean;
  readonly explanation?: string;

  private constructor(props: QuestionOptionProps) {
    this.id = props.id;
    this.label = props.label;
    this.value = props.value;
    if (props.isCorrect !== undefined) {
      this.isCorrect = props.isCorrect;
    }
    if (props.explanation !== undefined) {
      this.explanation = props.explanation;
    }
  }

  /**
   * Create a QuestionOption value object
   * @throws Error if required fields are missing
   */
  static create(props: QuestionOptionProps): QuestionOption {
    if (!props.id || typeof props.id !== 'string') {
      throw new Error('Option id is required and must be a string');
    }

    if (!props.label || typeof props.label !== 'string') {
      throw new Error('Option label is required and must be a string');
    }

    if (!props.value || typeof props.value !== 'string') {
      throw new Error('Option value is required and must be a string');
    }

    return new QuestionOption(props);
  }

  /**
   * Check equality with another QuestionOption
   */
  equals(other: QuestionOption): boolean {
    return this.id === other.id && this.value === other.value;
  }

  /**
   * Convert to plain object
   */
  toObject(): QuestionOptionProps {
    return {
      id: this.id,
      label: this.label,
      value: this.value,
      ...(this.isCorrect !== undefined && { isCorrect: this.isCorrect }),
      ...(this.explanation !== undefined && { explanation: this.explanation }),
    };
  }
}
