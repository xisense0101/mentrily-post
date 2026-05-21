/**
 * AssessmentPublishPolicyService
 * Determines if an assessment can be published
 */

import { Assessment } from '../entities/index.js';
import { QuestionValidationPolicyService } from './question-validation-policy.service.js';

export interface PublishPolicyResult {
  allowed: boolean;
  reason?: string;
}

export class AssessmentPublishPolicyService {
  private questionValidator: QuestionValidationPolicyService;

  constructor(questionValidator?: QuestionValidationPolicyService) {
    this.questionValidator = questionValidator ?? new QuestionValidationPolicyService();
  }

  /**
   * Check if assessment can be published
   */
  canPublish(assessment: Assessment): PublishPolicyResult {
    // Archived assessments cannot be published
    if (assessment.isArchived()) {
      return { allowed: false, reason: 'Archived assessments cannot be published' };
    }

    // Only draft assessments can be published
    if (!assessment.isDraft()) {
      return { allowed: false, reason: 'Only draft assessments can be published' };
    }

    // Must have a draft version
    if (!assessment.currentDraftVersion) {
      return { allowed: false, reason: 'Assessment must have a draft version to publish' };
    }

    // Draft version must be in DRAFT status
    if (!assessment.currentDraftVersion.isDraft()) {
      return { allowed: false, reason: 'Draft version must be in DRAFT status' };
    }

    // Must contain at least one question
    const questionCount = assessment.currentDraftVersion.getQuestionCount();
    if (questionCount === 0) {
      return { allowed: false, reason: 'Assessment must contain at least one question' };
    }

    // All questions must pass validation
    const allQuestions = assessment.currentDraftVersion.getAllQuestions();
    for (const question of allQuestions) {
      const validation = this.questionValidator.validateQuestion(question);
      if (!validation.valid) {
        return { allowed: false, reason: `Question validation failed: ${validation.reason}` };
      }
    }

    // Total points validation (0 points is allowed for practice assessments)
    const totalPoints = allQuestions.reduce((sum, q) => sum + q.points.value(), 0);

    // For graded assessments, prefer at least 1 point total
    // But don't block practice/ungraded assessments with zero points
    if (assessment.purpose === 'EXAM' || assessment.purpose === 'CERTIFICATION') {
      if (totalPoints === 0) {
        return { allowed: false, reason: 'Graded assessments should have at least 1 total point' };
      }
    }

    return { allowed: true };
  }
}
