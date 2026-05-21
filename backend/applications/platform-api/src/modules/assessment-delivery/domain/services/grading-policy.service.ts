/**
 * GradingPolicyService
 * Validates grading configuration for assessments
 */

import { AssessmentQuestion, GradingRubric, GradingRule } from '../entities/index.js';

export interface GradingValidationResult {
  valid: boolean;
  reason?: string;
}

export interface GradingValidationInput {
  questions: AssessmentQuestion[];
  rubrics: GradingRubric[];
  rules: GradingRule[];
}

export class GradingPolicyService {
  /**
   * Validate grading rules configuration
   */
  validateGradingRules(input: GradingValidationInput): GradingValidationResult {
    // Check for duplicate rule IDs
    const ruleIds = input.rules.map((r) => r.id);
    const uniqueRuleIds = new Set(ruleIds);
    if (uniqueRuleIds.size !== ruleIds.length) {
      return { valid: false, reason: 'Grading rule IDs must be unique' };
    }

    // Check that question-specific rules reference existing questions
    const questionIds = new Set(input.questions.map((q) => q.id));
    for (const rule of input.rules) {
      if (rule.questionId && !questionIds.has(rule.questionId)) {
        return {
          valid: false,
          reason: `Grading rule references non-existent question: ${rule.questionId}`,
        };
      }
    }

    // Check that rubric rules reference existing rubrics
    const rubricIds = new Set(input.rubrics.map((r) => r.id));
    for (const rule of input.rules) {
      const rubricId = (rule.config as Record<string, unknown>)?.rubricId;
      if (rubricId && !rubricIds.has(rubricId as string)) {
        return { valid: false, reason: `Grading rule references non-existent rubric: ${rubricId}` };
      }
    }

    // CODE_OUTPUT_RESERVED rules are structurally valid but marked reserved
    for (const rule of input.rules) {
      if (rule.isCodeExecutionReserved()) {
        // Code execution is reserved for later runtime integration
        // But the rule structure is valid
        continue;
      }
    }

    return { valid: true };
  }
}
