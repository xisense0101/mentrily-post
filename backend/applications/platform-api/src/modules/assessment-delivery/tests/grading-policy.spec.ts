/**
 * Grading Policy Tests
 */

import { describe, it, expect } from 'vitest';
import {
  AssessmentQuestion,
  GradingRule,
  GradingRubric,
  QuestionOption,
  QuestionPoints,
  QuestionKindEnum,
  GradingModeEnum,
  GradingPolicyService,
} from '../domain/index.js';

describe('Grading Policy', () => {
  const service = new GradingPolicyService();

  const createQuestion = (id: string) => {
    return AssessmentQuestion.create({
      id,
      assessmentId: 'a1',
      kind: QuestionKindEnum.MCQ,
      title: 'Q',
      prompt: { text: 'Q' },
      options: [
        QuestionOption.create({ id: 'opt1', label: 'A', value: 'a', isCorrect: true }),
        QuestionOption.create({ id: 'opt2', label: 'B', value: 'b', isCorrect: false }),
      ],
      points: QuestionPoints.create(1),
      gradingMode: GradingModeEnum.AUTO,
      position: 0,
      metadata: {},
    });
  };

  const createRubric = (id: string) => {
    return GradingRubric.create({
      id,
      assessmentId: 'a1',
      title: 'Rubric',
      criteria: [
        {
          id: 'crit1',
          label: 'Criterion 1',
          maxPoints: 10,
        },
      ],
    });
  };

  it('should accept valid grading rules', () => {
    const questions = [createQuestion('q1')];
    const rubrics = [createRubric('r1')];
    const rules = [
      GradingRule.create({
        id: 'rule1',
        assessmentId: 'a1',
        questionId: 'q1',
        mode: GradingModeEnum.AUTO,
        ruleType: 'EXACT_MATCH',
        config: {},
      }),
    ];

    const result = service.validateGradingRules({ questions, rubrics, rules });
    expect(result.valid).toBe(true);
  });

  it('should reject duplicate rule IDs', () => {
    const questions = [createQuestion('q1')];
    const rubrics: GradingRubric[] = [];
    const rules = [
      GradingRule.create({
        id: 'rule1',
        assessmentId: 'a1',
        questionId: 'q1',
        mode: GradingModeEnum.AUTO,
        ruleType: 'EXACT_MATCH',
        config: {},
      }),
      GradingRule.create({
        id: 'rule1',
        assessmentId: 'a1',
        questionId: 'q1',
        mode: GradingModeEnum.AUTO,
        ruleType: 'OPTION_MATCH',
        config: {},
      }),
    ];

    const result = service.validateGradingRules({ questions, rubrics, rules });
    expect(result.valid).toBe(false);
  });

  it('should reject rule with non-existent question', () => {
    const questions = [createQuestion('q1')];
    const rubrics: GradingRubric[] = [];
    const rules = [
      GradingRule.create({
        id: 'rule1',
        assessmentId: 'a1',
        questionId: 'non-existent',
        mode: GradingModeEnum.AUTO,
        ruleType: 'EXACT_MATCH',
        config: {},
      }),
    ];

    const result = service.validateGradingRules({ questions, rubrics, rules });
    expect(result.valid).toBe(false);
  });

  it('should reject rule with non-existent rubric', () => {
    const questions: AssessmentQuestion[] = [];
    const rubrics: GradingRubric[] = [];
    const rules = [
      GradingRule.create({
        id: 'rule1',
        assessmentId: 'a1',
        mode: GradingModeEnum.MANUAL,
        ruleType: 'RUBRIC',
        config: { rubricId: 'non-existent' },
      }),
    ];

    const result = service.validateGradingRules({ questions, rubrics, rules });
    expect(result.valid).toBe(false);
  });

  it('should accept CODE_OUTPUT_RESERVED rules structurally', () => {
    const questions: AssessmentQuestion[] = [];
    const rubrics: GradingRubric[] = [];
    const rules = [
      GradingRule.create({
        id: 'rule1',
        assessmentId: 'a1',
        mode: GradingModeEnum.AUTO,
        ruleType: 'CODE_OUTPUT_RESERVED',
        config: { reserved: true },
      }),
    ];

    const result = service.validateGradingRules({ questions, rubrics, rules });
    expect(result.valid).toBe(true);
  });
});
