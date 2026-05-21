/**
 * QuestionValidationPolicyService
 * Validates individual questions against domain rules
 */

import { AssessmentQuestion } from '../entities/index.js';
import { isReservedRuntimeKind } from '../value-objects/index.js';

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

export class QuestionValidationPolicyService {
  /**
   * Validate a question against domain rules
   */
  validateQuestion(question: AssessmentQuestion): ValidationResult {
    // Validate title
    if (!question.title || question.title.trim().length === 0) {
      return { valid: false, reason: 'Question title cannot be empty' };
    }

    // Validate prompt
    if (typeof question.prompt !== 'object' || question.prompt === null) {
      return { valid: false, reason: 'Question prompt must be an object' };
    }

    // Validate options based on question kind
    const optionValidation = this.validateOptionsForKind(question);
    if (!optionValidation.valid) {
      return optionValidation;
    }

    // Validate grading mode compatibility
    const gradingValidation = this.validateGradingModeForKind(question);
    if (!gradingValidation.valid) {
      return gradingValidation;
    }

    // Validate answer key compatibility
    const answerKeyValidation = this.validateAnswerKeyForKind(question);
    if (!answerKeyValidation.valid) {
      return answerKeyValidation;
    }

    // CODE and NOTEBOOK questions are structurally valid but reserved
    if (isReservedRuntimeKind(question.kind)) {
      return { valid: true, reason: 'Code/notebook execution reserved for runtime integration' };
    }

    return { valid: true };
  }

  /**
   * Validate options based on question kind
   */
  private validateOptionsForKind(question: AssessmentQuestion): ValidationResult {
    switch (question.kind) {
      case 'MCQ':
        if (question.options.length < 2) {
          return { valid: false, reason: 'MCQ must have at least 2 options' };
        }
        // Check exactly one correct option for auto-graded MCQ
        if (question.gradingMode === 'AUTO' && question.answerKey?.hasOptionAnswers()) {
          const correctCount = question.options.filter((o) => o.isCorrect).length;
          if (correctCount !== 1) {
            return { valid: false, reason: 'Auto-graded MCQ must have exactly one correct option' };
          }
        }
        break;

      case 'MULTI_SELECT':
        if (question.options.length < 2) {
          return { valid: false, reason: 'MULTI_SELECT must have at least 2 options' };
        }
        // Check at least one correct option for auto-graded multi-select
        if (question.gradingMode === 'AUTO' && question.answerKey?.hasOptionAnswers()) {
          const correctCount = question.options.filter((o) => o.isCorrect).length;
          if (correctCount < 1) {
            return {
              valid: false,
              reason: 'Auto-graded MULTI_SELECT must have at least one correct option',
            };
          }
        }
        break;

      case 'TRUE_FALSE':
        if (question.options.length !== 2) {
          return { valid: false, reason: 'TRUE_FALSE question must have exactly 2 options' };
        }
        break;

      case 'SHORT_ANSWER':
      case 'LONG_ANSWER':
      case 'FILE_UPLOAD':
        // No strict option requirements for text/file answers
        break;

      case 'CODE':
      case 'NOTEBOOK':
        // Code questions can have optional setup/template options
        break;

      case 'READING_PASSAGE':
        // Reading passages don't require answer keys
        break;

      case 'RUBRIC_ONLY':
        // Rubric-only questions don't need structural options
        break;

      default:
        break;
    }

    return { valid: true };
  }

  /**
   * Validate grading mode for question kind
   */
  private validateGradingModeForKind(question: AssessmentQuestion): ValidationResult {
    // CODE and NOTEBOOK cannot be auto-graded in this phase
    if (
      (question.kind === 'CODE' || question.kind === 'NOTEBOOK') &&
      question.gradingMode === 'AUTO'
    ) {
      return {
        valid: false,
        reason: `${question.kind} questions cannot be auto-graded (reserved for runtime)`,
      };
    }

    // LONG_ANSWER generally should be manual or hybrid
    if (question.kind === 'LONG_ANSWER' && question.gradingMode === 'AUTO') {
      return { valid: false, reason: 'LONG_ANSWER questions should use MANUAL or HYBRID grading' };
    }

    // FILE_UPLOAD should be manual or hybrid
    if (question.kind === 'FILE_UPLOAD' && question.gradingMode === 'AUTO') {
      return { valid: false, reason: 'FILE_UPLOAD questions should use MANUAL or HYBRID grading' };
    }

    // RUBRIC_ONLY should be manual or hybrid
    if (question.kind === 'RUBRIC_ONLY' && question.gradingMode === 'AUTO') {
      return { valid: false, reason: 'RUBRIC_ONLY questions must use MANUAL or HYBRID grading' };
    }

    return { valid: true };
  }

  /**
   * Validate answer key compatibility with question kind
   */
  private validateAnswerKeyForKind(question: AssessmentQuestion): ValidationResult {
    if (!question.answerKey) {
      // Answer key is optional but recommended for gradable questions
      return { valid: true };
    }

    if (question.kind === 'MCQ' || question.kind === 'MULTI_SELECT') {
      if (!question.answerKey.hasOptionAnswers() && !question.answerKey.usesRubric()) {
        return {
          valid: false,
          reason: `${question.kind} answer key must include option IDs or rubric`,
        };
      }
    }

    if (question.kind === 'SHORT_ANSWER') {
      if (!question.answerKey.hasTextAnswers() && !question.answerKey.usesRubric()) {
        return { valid: false, reason: 'SHORT_ANSWER must have accepted text answers or rubric' };
      }
    }

    if (question.kind === 'CODE' || question.kind === 'NOTEBOOK') {
      if (question.answerKey.hasCodeOutput()) {
        return { valid: true, reason: 'Code output answer key accepted but execution reserved' };
      }
    }

    return { valid: true };
  }
}
