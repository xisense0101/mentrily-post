/**
 * AssessmentSection Entity
 * Represents a section containing multiple questions within an assessment
 */

import { AssessmentQuestion } from './assessment-question.entity.js';

export interface AssessmentSectionProps {
  id: string;
  assessmentId: string;
  title: string;
  description?: string;
  position: number;
  questions: AssessmentQuestion[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export class AssessmentSection {
  readonly id: string;
  readonly assessmentId: string;
  title: string;
  description?: string;
  position: number;
  questions: AssessmentQuestion[];
  metadata: Record<string, unknown>;
  readonly createdAt: Date;
  updatedAt: Date;

  private constructor(props: AssessmentSectionProps) {
    this.id = props.id;
    this.assessmentId = props.assessmentId;
    this.title = props.title;
    if (props.description !== undefined) {
      this.description = props.description;
    }
    this.position = props.position;
    this.questions = props.questions;
    this.metadata = props.metadata;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  /**
   * Create a new AssessmentSection
   */
  static create(props: Omit<AssessmentSectionProps, 'createdAt' | 'updatedAt'>): AssessmentSection {
    AssessmentSection.validateProps(props);

    const now = new Date();
    return new AssessmentSection({
      ...props,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Restore an AssessmentSection from persistence
   */
  static restore(props: AssessmentSectionProps): AssessmentSection {
    AssessmentSection.validateProps(props);
    return new AssessmentSection(props);
  }

  /**
   * Validate section properties
   */
  private static validateProps(
    props: Omit<AssessmentSectionProps, 'createdAt' | 'updatedAt'>,
  ): void {
    if (!props.id || typeof props.id !== 'string') {
      throw new Error('Section id is required');
    }

    if (!props.assessmentId || typeof props.assessmentId !== 'string') {
      throw new Error('Section assessmentId is required');
    }

    if (!props.title || typeof props.title !== 'string') {
      throw new Error('Section title is required');
    }

    if (!Number.isInteger(props.position) || props.position < 0) {
      throw new Error('Section position must be a non-negative integer');
    }

    if (!Array.isArray(props.questions)) {
      throw new Error('Questions must be an array');
    }

    // Validate question IDs are unique within section
    const questionIds = props.questions.map((q) => q.id);
    const uniqueIds = new Set(questionIds);
    if (uniqueIds.size !== questionIds.length) {
      throw new Error('Question IDs must be unique within a section');
    }

    if (typeof props.metadata !== 'object' || props.metadata === null) {
      throw new Error('Metadata must be an object');
    }
  }

  /**
   * Rename the section
   */
  rename(newTitle: string): void {
    if (!newTitle || typeof newTitle !== 'string') {
      throw new Error('Title must be a non-empty string');
    }
    this.title = newTitle;
    this.updatedAt = new Date();
  }

  /**
   * Update description (safely handle clearing)
   */
  updateDescription(newDescription?: string): void {
    if (newDescription !== undefined && typeof newDescription !== 'string') {
      throw new Error('Description must be a string');
    }

    if (newDescription !== undefined) {
      this.description = newDescription;
    } else {
      delete this.description;
    }
    this.updatedAt = new Date();
  }

  /**
   * Add a question to the section
   */
  addQuestion(question: AssessmentQuestion, position?: number): void {
    if (!question || !(question instanceof AssessmentQuestion)) {
      throw new Error('Question must be an AssessmentQuestion instance');
    }

    if (this.questions.some((q) => q.id === question.id)) {
      throw new Error('Question with this id already exists in section');
    }

    question.attachToSection(this.id);

    if (position !== undefined) {
      if (!Number.isInteger(position) || position < 0 || position > this.questions.length) {
        throw new Error('Position must be a valid index');
      }
      this.questions.splice(position, 0, question);
    } else {
      this.questions.push(question);
    }

    this.updatedAt = new Date();
  }

  /**
   * Remove a question from the section by id
   */
  removeQuestion(questionId: string): void {
    const index = this.questions.findIndex((q) => q.id === questionId);
    if (index === -1) {
      throw new Error('Question not found in section');
    }

    const [removedQuestion] = this.questions.splice(index, 1);
    if (removedQuestion) {
      removedQuestion.detachFromSection();
    }

    this.updatedAt = new Date();
  }

  /**
   * Replace all questions
   */
  replaceQuestions(newQuestions: AssessmentQuestion[]): void {
    if (!Array.isArray(newQuestions)) {
      throw new Error('Questions must be an array');
    }

    // Validate unique IDs
    const questionIds = newQuestions.map((q) => q.id);
    const uniqueIds = new Set(questionIds);
    if (uniqueIds.size !== questionIds.length) {
      throw new Error('Question IDs must be unique');
    }

    // Detach old questions
    this.questions.forEach((q) => q.detachFromSection());

    // Attach new questions
    newQuestions.forEach((q) => q.attachToSection(this.id));

    this.questions = newQuestions;
    this.updatedAt = new Date();
  }

  /**
   * Move a question to a new position within the section
   */
  moveQuestion(questionId: string, newPosition: number): void {
    if (!Number.isInteger(newPosition) || newPosition < 0 || newPosition >= this.questions.length) {
      throw new Error('New position must be a valid array index');
    }

    const currentIndex = this.questions.findIndex((q) => q.id === questionId);
    if (currentIndex === -1) {
      throw new Error('Question not found in section');
    }

    const [movedQuestion] = this.questions.splice(currentIndex, 1);
    if (movedQuestion) {
      this.questions.splice(newPosition, 0, movedQuestion);
    }

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
   * Get question count
   */
  getQuestionCount(): number {
    return this.questions.length;
  }

  /**
   * Convert to plain object
   */
  toObject(): AssessmentSectionProps {
    return {
      id: this.id,
      assessmentId: this.assessmentId,
      title: this.title,
      ...(this.description && { description: this.description }),
      position: this.position,
      questions: this.questions.map((q) => q.toObject() as AssessmentQuestion),
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
