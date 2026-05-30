/**
 * Question Validation Policy Tests
 */

import { describe, it, expect } from 'vitest';
import {
  AssessmentQuestion,
  QuestionOption,
  QuestionPoints,
  QuestionKindEnum,
  GradingModeEnum,
  QuestionAnswerKey,
  QuestionValidationPolicyService,
} from '../domain/index.js';

describe('Question Validation Policy', () => {
  const service = new QuestionValidationPolicyService();

  const createBaseQuestion = (kind: QuestionKindEnum, overrides?: Record<string, unknown>) => {
    return AssessmentQuestion.create({
      id: 'q1',
      assessmentId: 'a1',
      kind,
      title: 'Question',
      prompt: { text: 'Question' },
      options: [
        QuestionOption.create({ id: 'opt1', label: 'A', value: 'a', isCorrect: true }),
        QuestionOption.create({ id: 'opt2', label: 'B', value: 'b', isCorrect: false }),
      ],
      points: QuestionPoints.create(1),
      gradingMode: GradingModeEnum.AUTO,
      position: 0,
      metadata: {},
      ...overrides,
    });
  };

  describe('MCQ Validation', () => {
    it('should accept valid MCQ', () => {
      const question = createBaseQuestion(QuestionKindEnum.MCQ);
      const result = service.validateQuestion(question);
      expect(result.valid).toBe(true);
    });

    it('should reject MCQ with insufficient options', () => {
      expect(() =>
        AssessmentQuestion.create({
          id: 'q1',
          assessmentId: 'a1',
          kind: QuestionKindEnum.MCQ,
          title: 'Q',
          prompt: { text: 'Q' },
          options: [QuestionOption.create({ id: 'opt1', label: 'A', value: 'a', isCorrect: true })],
          points: QuestionPoints.create(1),
          gradingMode: GradingModeEnum.AUTO,
          position: 0,
          metadata: {},
        }),
      ).toThrow('MCQ must have at least 2 options');
    });

    it('should reject auto-graded MCQ without exactly one correct', () => {
      expect(() =>
        AssessmentQuestion.create({
          id: 'q1',
          assessmentId: 'a1',
          kind: QuestionKindEnum.MCQ,
          title: 'Q',
          prompt: { text: 'Q' },
          options: [
            QuestionOption.create({ id: 'opt1', label: 'A', value: 'a', isCorrect: false }),
            QuestionOption.create({ id: 'opt2', label: 'B', value: 'b', isCorrect: false }),
          ],
          points: QuestionPoints.create(1),
          gradingMode: GradingModeEnum.AUTO,
          position: 0,
          metadata: {},
          answerKey: QuestionAnswerKey.create({ correctOptionIds: ['none'] }),
        }),
      ).toThrow('Auto-graded MCQ must have exactly one correct option');
    });
  });

  describe('MultiSelect Validation', () => {
    it('should accept valid multi-select', () => {
      const question = createBaseQuestion(QuestionKindEnum.MULTI_SELECT, {
        options: [
          QuestionOption.create({ id: 'opt1', label: 'A', value: 'a', isCorrect: true }),
          QuestionOption.create({ id: 'opt2', label: 'B', value: 'b', isCorrect: true }),
        ],
      });
      const result = service.validateQuestion(question);
      expect(result.valid).toBe(true);
    });

    it('should reject multi-select with insufficient options', () => {
      expect(() =>
        AssessmentQuestion.create({
          id: 'q1',
          assessmentId: 'a1',
          kind: QuestionKindEnum.MULTI_SELECT,
          title: 'Q',
          prompt: { text: 'Q' },
          options: [QuestionOption.create({ id: 'opt1', label: 'A', value: 'a', isCorrect: true })],
          points: QuestionPoints.create(1),
          gradingMode: GradingModeEnum.AUTO,
          position: 0,
          metadata: {},
        }),
      ).toThrow('MULTI_SELECT must have at least 2 options');
    });

    it('should reject auto-graded multi-select without correct options', () => {
      expect(() =>
        AssessmentQuestion.create({
          id: 'q1',
          assessmentId: 'a1',
          kind: QuestionKindEnum.MULTI_SELECT,
          title: 'Q',
          prompt: { text: 'Q' },
          options: [
            QuestionOption.create({ id: 'opt1', label: 'A', value: 'a', isCorrect: false }),
            QuestionOption.create({ id: 'opt2', label: 'B', value: 'b', isCorrect: false }),
          ],
          points: QuestionPoints.create(1),
          gradingMode: GradingModeEnum.AUTO,
          position: 0,
          metadata: {},
          answerKey: QuestionAnswerKey.create({ correctOptionIds: ['none'] }),
        }),
      ).toThrow('Auto-graded MULTI_SELECT must have at least one correct option');
    });
  });

  describe('TrueFalse Validation', () => {
    it('should accept valid true/false', () => {
      const question = createBaseQuestion(QuestionKindEnum.TRUE_FALSE);
      const result = service.validateQuestion(question);
      expect(result.valid).toBe(true);
    });
  });

  describe('Short Answer Validation', () => {
    it('should accept short answer with text answers', () => {
      const question = createBaseQuestion(QuestionKindEnum.SHORT_ANSWER, {
        options: [],
        answerKey: QuestionAnswerKey.create({
          acceptedTextAnswers: ['hello', 'hi'],
        }),
      });
      const result = service.validateQuestion(question);
      expect(result.valid).toBe(true);
    });
  });

  describe('Long Answer Validation', () => {
    it('should reject auto-graded long answer', () => {
      const question = createBaseQuestion(QuestionKindEnum.LONG_ANSWER, {
        gradingMode: GradingModeEnum.AUTO,
      });
      const result = service.validateQuestion(question);
      expect(result.valid).toBe(false);
    });

    it('should accept manual long answer', () => {
      const question = createBaseQuestion(QuestionKindEnum.LONG_ANSWER, {
        gradingMode: GradingModeEnum.MANUAL,
      });
      const result = service.validateQuestion(question);
      expect(result.valid).toBe(true);
    });
  });

  describe('Code Question Validation', () => {
    it('should accept code question structurally', () => {
      const question = createBaseQuestion(QuestionKindEnum.CODE, {
        options: [],
        gradingMode: GradingModeEnum.MANUAL,
      });
      const result = service.validateQuestion(question);
      expect(result.valid).toBe(true);
    });

    it('should reject auto-graded code question', () => {
      const question = createBaseQuestion(QuestionKindEnum.CODE, {
        options: [],
        gradingMode: GradingModeEnum.AUTO,
        metadata: { gradingTestCases: [] },
      });
      const result = service.validateQuestion(question);
      expect(result.valid).toBe(false);
    });
  });

  describe('File Upload Validation', () => {
    it('should reject auto-graded file upload', () => {
      const question = createBaseQuestion(QuestionKindEnum.FILE_UPLOAD, {
        gradingMode: GradingModeEnum.AUTO,
      });
      const result = service.validateQuestion(question);
      expect(result.valid).toBe(false);
    });

    it('should accept manual file upload', () => {
      const question = createBaseQuestion(QuestionKindEnum.FILE_UPLOAD, {
        gradingMode: GradingModeEnum.MANUAL,
      });
      const result = service.validateQuestion(question);
      expect(result.valid).toBe(true);
    });
  });

  describe('Rubric Only Validation', () => {
    it('should reject auto-graded rubric-only', () => {
      const question = createBaseQuestion(QuestionKindEnum.RUBRIC_ONLY, {
        gradingMode: GradingModeEnum.AUTO,
      });
      const result = service.validateQuestion(question);
      expect(result.valid).toBe(false);
    });

    it('should accept manual rubric-only', () => {
      const question = createBaseQuestion(QuestionKindEnum.RUBRIC_ONLY, {
        gradingMode: GradingModeEnum.MANUAL,
      });
      const result = service.validateQuestion(question);
      expect(result.valid).toBe(true);
    });
  });

  describe('Reading Passage Validation', () => {
    it('should accept reading passage as non-answerable context', () => {
      const question = createBaseQuestion(QuestionKindEnum.READING_PASSAGE, {
        options: [],
        gradingMode: GradingModeEnum.MANUAL,
        points: QuestionPoints.create(0),
        answerKey: undefined,
        prompt: {
          text: 'Read the passage',
          passageTitle: 'Context',
          passageBody: 'Paragraph one',
        },
      });
      const result = service.validateQuestion(question);
      expect(result.valid).toBe(true);
    });
  });
});
