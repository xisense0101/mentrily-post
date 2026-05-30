/**
 * AssessmentQuestionDomain Tests
 * Verifies question entity behavior and validation rules
 */

import { describe, it, expect } from 'vitest';
import {
  AssessmentQuestion,
  QuestionOption,
  QuestionAnswerKey,
  QuestionPoints,
  QuestionKindEnum,
  GradingModeEnum,
} from '../domain/index.js';

describe('AssessmentQuestion Domain', () => {
  const baseProps = {
    id: 'q1',
    assessmentId: 'a1',
    kind: QuestionKindEnum.MCQ as const,
    title: 'What is 2+2?',
    prompt: { type: 'text', content: 'Basic math' },
    options: [
      QuestionOption.create({ id: 'opt1', label: 'Option 1', value: '4', isCorrect: true }),
      QuestionOption.create({ id: 'opt2', label: 'Option 2', value: '5', isCorrect: false }),
    ],
    points: QuestionPoints.create(1),
    gradingMode: GradingModeEnum.AUTO,
    position: 0,
    metadata: {},
  };

  describe('MCQ Questions', () => {
    it('should create valid MCQ with 2 options', () => {
      const question = AssessmentQuestion.create(baseProps);
      expect(question.kind).toBe(QuestionKindEnum.MCQ);
      expect(question.options.length).toBe(2);
    });

    it('should reject MCQ with less than 2 options', () => {
      expect(() => {
        AssessmentQuestion.create({
          ...baseProps,
          options: [baseProps.options[0]!],
        });
      }).toThrow('MCQ must have at least 2 options');
    });

    it('should reject auto-graded MCQ without exactly one correct option', () => {
      const noCorrect = [
        QuestionOption.create({ id: 'opt1', label: 'Option 1', value: '4', isCorrect: false }),
        QuestionOption.create({ id: 'opt2', label: 'Option 2', value: '5', isCorrect: false }),
      ];

      expect(() => {
        AssessmentQuestion.create({
          ...baseProps,
          options: noCorrect,
          answerKey: QuestionAnswerKey.create({ correctOptionIds: ['none'] }),
        });
      }).toThrow('Auto-graded MCQ must have exactly one correct option');
    });

    it('should accept MCQ with manual grading and no answer key', () => {
      const question = AssessmentQuestion.create({
        ...baseProps,
        gradingMode: GradingModeEnum.MANUAL,
      });
      expect(question.gradingMode).toBe(GradingModeEnum.MANUAL);
    });
  });

  describe('MultiSelect Questions', () => {
    it('should create valid multi-select with 2 options', () => {
      const question = AssessmentQuestion.create({
        ...baseProps,
        kind: QuestionKindEnum.MULTI_SELECT,
        options: [
          QuestionOption.create({ id: 'opt1', label: 'Correct 1', value: 'a', isCorrect: true }),
          QuestionOption.create({ id: 'opt2', label: 'Correct 2', value: 'b', isCorrect: true }),
          QuestionOption.create({ id: 'opt3', label: 'Wrong', value: 'c', isCorrect: false }),
        ],
      });
      expect(question.kind).toBe(QuestionKindEnum.MULTI_SELECT);
    });

    it('should reject multi-select with less than 2 options', () => {
      expect(() => {
        AssessmentQuestion.create({
          ...baseProps,
          kind: QuestionKindEnum.MULTI_SELECT,
          options: [baseProps.options[0]!],
        });
      }).toThrow('MULTI_SELECT must have at least 2 options');
    });

    it('should reject auto-graded multi-select without at least one correct', () => {
      const noCorrect = [
        QuestionOption.create({ id: 'opt1', label: 'Option 1', value: '4', isCorrect: false }),
        QuestionOption.create({ id: 'opt2', label: 'Option 2', value: '5', isCorrect: false }),
      ];

      expect(() => {
        AssessmentQuestion.create({
          ...baseProps,
          kind: QuestionKindEnum.MULTI_SELECT,
          options: noCorrect,
          answerKey: QuestionAnswerKey.create({ correctOptionIds: ['none'] }),
        });
      }).toThrow('Auto-graded MULTI_SELECT must have at least one correct option');
    });
  });

  describe('True/False Questions', () => {
    it('should create true/false with exactly 2 options', () => {
      const question = AssessmentQuestion.create({
        ...baseProps,
        kind: QuestionKindEnum.TRUE_FALSE,
        options: [
          QuestionOption.create({ id: 'true', label: 'True', value: 'true', isCorrect: true }),
          QuestionOption.create({ id: 'false', label: 'False', value: 'false', isCorrect: false }),
        ],
      });
      expect(question.options.length).toBe(2);
    });

    it('should reject true/false with wrong number of options', () => {
      expect(() => {
        AssessmentQuestion.create({
          ...baseProps,
          kind: QuestionKindEnum.TRUE_FALSE,
          options: [
            baseProps.options[0]!,
            baseProps.options[1]!,
            QuestionOption.create({ id: 'opt3', label: 'Maybe', value: 'maybe', isCorrect: false }),
          ],
        });
      }).toThrow('TRUE_FALSE question must have exactly 2 options');
    });
  });

  describe('Short Answer Questions', () => {
    it('should accept short answer with text answers', () => {
      const question = AssessmentQuestion.create({
        ...baseProps,
        kind: QuestionKindEnum.SHORT_ANSWER,
        options: [],
        answerKey: QuestionAnswerKey.create({
          acceptedTextAnswers: ['hello', 'hi', 'hey'],
        }),
      });
      expect(question.kind).toBe(QuestionKindEnum.SHORT_ANSWER);
    });
  });

  describe('Code Questions', () => {
    it('should create code question structurally', () => {
      const question = AssessmentQuestion.create({
        ...baseProps,
        kind: QuestionKindEnum.CODE,
        gradingMode: GradingModeEnum.MANUAL,
        options: [],
        answerKey: QuestionAnswerKey.create({
          expectedOutput: 'print("hello")',
        }),
      });
      expect(question.kind).toBe(QuestionKindEnum.CODE);
      expect(question.answerKey?.hasCodeOutput()).toBe(true);
    });

    it('should allow auto-graded code question structurally (runtime reserved)', () => {
      const question = AssessmentQuestion.create({
        ...baseProps,
        kind: QuestionKindEnum.CODE,
        gradingMode: GradingModeEnum.AUTO,
        options: [],
        metadata: { gradingTestCases: [] },
      });
      expect(question.kind).toBe(QuestionKindEnum.CODE);
    });
  });

  describe('Reading Passage Questions', () => {
    it('should create reading passage as structural context', () => {
      const question = AssessmentQuestion.create({
        ...baseProps,
        kind: QuestionKindEnum.READING_PASSAGE,
        prompt: {
          text: 'Read first',
          passageTitle: 'Passage',
          passageBody: 'Body copy',
        },
        options: [],
        points: QuestionPoints.create(0),
        gradingMode: GradingModeEnum.MANUAL,
      });
      expect(question.kind).toBe(QuestionKindEnum.READING_PASSAGE);
      expect(question.points.value()).toBe(0);
      expect(question.answerKey).toBeUndefined();
    });
  });

  describe('File Upload Questions', () => {
    it('should create file upload question without storage behavior', () => {
      const question = AssessmentQuestion.create({
        ...baseProps,
        kind: QuestionKindEnum.FILE_UPLOAD,
        options: [],
        gradingMode: GradingModeEnum.MANUAL,
        metadata: {
          allowedFileCategories: ['document'],
          maxFiles: 2,
          maxFileSizeMb: 10,
          placeholderOnly: true,
        },
      });
      expect(question.kind).toBe(QuestionKindEnum.FILE_UPLOAD);
      expect(question.metadata.placeholderOnly).toBe(true);
    });
  });

  describe('Question Mutations', () => {
    it('should rename question', () => {
      const question = AssessmentQuestion.create(baseProps);
      question.rename('New Title');
      expect(question.title).toBe('New Title');
    });

    it('should update prompt', () => {
      const question = AssessmentQuestion.create(baseProps);
      const newPrompt = { type: 'html', content: '<p>New</p>' };
      question.updatePrompt(newPrompt);
      expect(question.prompt).toEqual(newPrompt);
    });

    it('should move question position', () => {
      const question = AssessmentQuestion.create(baseProps);
      question.moveTo(5);
      expect(question.position).toBe(5);
    });

    it('should attach to section', () => {
      const question = AssessmentQuestion.create(baseProps);
      question.attachToSection('section-1');
      expect(question.sectionId).toBe('section-1');
    });

    it('should detach from section', () => {
      const question = AssessmentQuestion.create({
        ...baseProps,
        sectionId: 'section-1',
      });
      question.detachFromSection();
      expect(question.sectionId).toBeUndefined();
    });

    it('should update points', () => {
      const question = AssessmentQuestion.create(baseProps);
      const newPoints = QuestionPoints.create(5);
      question.updatePoints(newPoints);
      expect(question.points.value()).toBe(5);
    });

    it('should update grading mode', () => {
      const question = AssessmentQuestion.create(baseProps);
      question.updateGradingMode(GradingModeEnum.MANUAL);
      expect(question.gradingMode).toBe(GradingModeEnum.MANUAL);
    });

    it('should update metadata', () => {
      const question = AssessmentQuestion.create(baseProps);
      question.updateMetadata({ custom: 'value' });
      expect(question.metadata.custom).toBe('value');
    });
  });

  describe('Option Replacement', () => {
    it('should replace options', () => {
      const question = AssessmentQuestion.create(baseProps);
      const newOptions = [
        QuestionOption.create({ id: 'new1', label: 'New 1', value: 'new1', isCorrect: true }),
        QuestionOption.create({ id: 'new2', label: 'New 2', value: 'new2', isCorrect: false }),
      ];
      question.replaceOptions(newOptions);
      expect(question.options).toEqual(newOptions);
    });

    it('should validate options on replacement', () => {
      const question = AssessmentQuestion.create(baseProps);
      expect(() => {
        question.replaceOptions([]);
      }).toThrow('Options must be a non-empty array');
    });
  });

  describe('Answer Key Management', () => {
    it('should update answer key', () => {
      const question = AssessmentQuestion.create(baseProps);
      const newKey = QuestionAnswerKey.create({
        correctOptionIds: ['opt1', 'opt2'],
      });
      question.updateAnswerKey(newKey);
      expect(question.answerKey?.hasOptionAnswers()).toBe(true);
    });

    it('should clear answer key', () => {
      const question = AssessmentQuestion.create({
        ...baseProps,
        answerKey: QuestionAnswerKey.create({ correctOptionIds: ['opt1'] }),
      });
      question.updateAnswerKey(undefined);
      expect(question.answerKey).toBeUndefined();
    });
  });
});
