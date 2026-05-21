/**
 * AssessmentQuestion Entity
 * Represents a single question within an assessment
 */

import {
  QuestionKind,
  QuestionOption,
  QuestionAnswerKey,
  QuestionPoints,
  GradingMode,
  assertValidQuestionKind,
  assertValidGradingMode,
} from '../value-objects/index.js';

export interface AssessmentQuestionProps {
  id: string;
  assessmentId: string;
  sectionId?: string;
  kind: QuestionKind;
  title: string;
  prompt: Record<string, unknown>;
  options: QuestionOption[];
  answerKey?: QuestionAnswerKey;
  points: QuestionPoints;
  gradingMode: GradingMode;
  position: number;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export class AssessmentQuestion {
  readonly id: string;
  readonly assessmentId: string;
  sectionId?: string;
  kind: QuestionKind;
  title: string;
  prompt: Record<string, unknown>;
  options: QuestionOption[];
  answerKey?: QuestionAnswerKey;
  points: QuestionPoints;
  gradingMode: GradingMode;
  position: number;
  metadata: Record<string, unknown>;
  readonly createdAt: Date;
  updatedAt: Date;

  private constructor(props: AssessmentQuestionProps) {
    this.id = props.id;
    this.assessmentId = props.assessmentId;
    if (props.sectionId !== undefined) {
      this.sectionId = props.sectionId;
    }
    this.kind = props.kind;
    this.title = props.title;
    this.prompt = props.prompt;
    this.options = props.options;
    if (props.answerKey !== undefined) {
      this.answerKey = props.answerKey;
    }
    this.points = props.points;
    this.gradingMode = props.gradingMode;
    this.position = props.position;
    this.metadata = props.metadata;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  /**
   * Create a new AssessmentQuestion
   */
  static create(
    props: Omit<AssessmentQuestionProps, 'createdAt' | 'updatedAt'>,
  ): AssessmentQuestion {
    AssessmentQuestion.validateProps(props);

    const now = new Date();
    return new AssessmentQuestion({
      ...props,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Restore an AssessmentQuestion from persistence
   */
  static restore(props: AssessmentQuestionProps): AssessmentQuestion {
    AssessmentQuestion.validateProps(props);
    return new AssessmentQuestion(props);
  }

  /**
   * Validate question properties
   */
  private static validateProps(
    props: Omit<AssessmentQuestionProps, 'createdAt' | 'updatedAt'>,
  ): void {
    if (!props.id || typeof props.id !== 'string') {
      throw new Error('Question id is required');
    }

    if (!props.assessmentId || typeof props.assessmentId !== 'string') {
      throw new Error('Question assessmentId is required');
    }

    if (!props.title || typeof props.title !== 'string') {
      throw new Error('Question title is required');
    }

    if (typeof props.prompt !== 'object' || props.prompt === null) {
      throw new Error('Question prompt must be an object');
    }

    if (!Number.isInteger(props.position) || props.position < 0) {
      throw new Error('Question position must be a non-negative integer');
    }

    AssessmentQuestion.validateQuestionKindRules(props);
  }

  /**
   * Validate question kind-specific rules
   */
  private static validateQuestionKindRules(
    props: Omit<AssessmentQuestionProps, 'createdAt' | 'updatedAt'>,
  ): void {
    const kind = assertValidQuestionKind(props.kind);
    const hasOptionAnswers = props.answerKey?.hasOptionAnswers() || false;
    const hasAtLeastOneCorrectOption = props.options.filter((opt) => opt.isCorrect).length >= 1;

    switch (kind) {
      case 'MCQ':
        if (props.options.length < 2) {
          throw new Error('MCQ must have at least 2 options');
        }
        // MCQ auto-graded must have exactly one correct option
        if (
          props.gradingMode === 'AUTO' &&
          hasOptionAnswers &&
          props.options.filter((opt) => opt.isCorrect).length !== 1
        ) {
          throw new Error('Auto-graded MCQ must have exactly one correct option');
        }
        break;

      case 'MULTI_SELECT':
        if (props.options.length < 2) {
          throw new Error('MULTI_SELECT must have at least 2 options');
        }
        // Multi-select auto-graded must have at least one correct option
        if (props.gradingMode === 'AUTO' && hasOptionAnswers && !hasAtLeastOneCorrectOption) {
          throw new Error('Auto-graded MULTI_SELECT must have at least one correct option');
        }
        break;

      case 'TRUE_FALSE':
        // Can have 2 options representing true/false
        if (props.options.length !== 2) {
          throw new Error('TRUE_FALSE question must have exactly 2 options');
        }
        break;

      case 'CODE':
      case 'NOTEBOOK':
        // CODE and NOTEBOOK are modeled only, no execution yet
        // But structural validation still applies
        break;

      case 'READING_PASSAGE':
        // Can have zero answer key and act as passage container
        // Child questions modeled separately later
        break;

      case 'LONG_ANSWER':
      case 'FILE_UPLOAD':
        // Should generally be manual or hybrid
        break;

      case 'SHORT_ANSWER':
        // Can use accepted text answers
        break;

      case 'RUBRIC_ONLY':
        // Should be manual/hybrid
        break;

      default:
        break;
    }
  }

  /**
   * Rename the question
   */
  rename(newTitle: string): void {
    if (!newTitle || typeof newTitle !== 'string') {
      throw new Error('Title must be a non-empty string');
    }
    this.title = newTitle;
    this.updatedAt = new Date();
  }

  /**
   * Update the question prompt
   */
  updatePrompt(newPrompt: Record<string, unknown>): void {
    if (typeof newPrompt !== 'object' || newPrompt === null) {
      throw new Error('Prompt must be an object');
    }
    this.prompt = newPrompt;
    this.updatedAt = new Date();
  }

  /**
   * Replace all options
   */
  replaceOptions(newOptions: QuestionOption[]): void {
    if (!Array.isArray(newOptions) || newOptions.length === 0) {
      throw new Error('Options must be a non-empty array');
    }

    // Re-validate kind-specific rules with new options
    const tempProps = {
      id: this.id,
      assessmentId: this.assessmentId,
      ...(this.sectionId && { sectionId: this.sectionId }),
      kind: this.kind,
      title: this.title,
      prompt: this.prompt,
      options: newOptions,
      ...(this.answerKey && { answerKey: this.answerKey }),
      points: this.points,
      gradingMode: this.gradingMode,
      position: this.position,
      metadata: this.metadata,
    };

    AssessmentQuestion.validateQuestionKindRules(tempProps);

    this.options = newOptions;
    this.updatedAt = new Date();
  }

  /**
   * Update the answer key
   */
  updateAnswerKey(newAnswerKey?: QuestionAnswerKey): void {
    if (newAnswerKey !== undefined) {
      this.answerKey = newAnswerKey;
    } else {
      delete this.answerKey;
    }
    this.updatedAt = new Date();
  }

  /**
   * Update points
   */
  updatePoints(newPoints: QuestionPoints): void {
    this.points = newPoints;
    this.updatedAt = new Date();
  }

  /**
   * Update grading mode
   */
  updateGradingMode(newMode: GradingMode): void {
    const mode = assertValidGradingMode(newMode);
    this.gradingMode = mode;
    this.updatedAt = new Date();
  }

  /**
   * Move question to a new position
   */
  moveTo(newPosition: number): void {
    if (!Number.isInteger(newPosition) || newPosition < 0) {
      throw new Error('Position must be a non-negative integer');
    }
    this.position = newPosition;
    this.updatedAt = new Date();
  }

  /**
   * Attach question to a section
   */
  attachToSection(sectionId: string): void {
    if (!sectionId || typeof sectionId !== 'string') {
      throw new Error('Section id is required');
    }
    this.sectionId = sectionId;
    this.updatedAt = new Date();
  }

  /**
   * Detach question from section
   */
  detachFromSection(): void {
    delete this.sectionId;
    this.updatedAt = new Date();
  }

  /**
   * Update metadata
   */
  updateMetadata(updates: Record<string, unknown>): void {
    if (typeof updates !== 'object' || updates === null) {
      throw new Error('Metadata updates must be an object');
    }
    this.metadata = { ...this.metadata, ...updates };
    this.updatedAt = new Date();
  }

  /**
   * Convert to plain object
   */
  toObject(): AssessmentQuestionProps {
    const obj: AssessmentQuestionProps = {
      id: this.id,
      assessmentId: this.assessmentId,
      kind: this.kind,
      title: this.title,
      prompt: this.prompt,
      options: this.options,
      points: this.points,
      gradingMode: this.gradingMode,
      position: this.position,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };

    if (this.sectionId !== undefined) {
      obj.sectionId = this.sectionId;
    }

    if (this.answerKey !== undefined) {
      obj.answerKey = this.answerKey;
    }

    return obj;
  }
}
