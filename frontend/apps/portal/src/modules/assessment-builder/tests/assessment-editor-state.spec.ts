import { describe, expect, it } from 'vitest';
import {
  appendLooseQuestion,
  appendQuestionToSection,
  appendSection,
  createCodeQuestionPlaceholder,
  createEmptySection,
  createFileUploadQuestion,
  createLongAnswerQuestion,
  createMcqQuestion,
  createMultiSelectQuestion,
  createReadingPassageQuestion,
  createShortAnswerQuestion,
  createTrueFalseQuestion,
  normalizeQuestionPositions,
  normalizeSectionPositions,
  removeQuestion,
  removeSection,
  toReplaceAssessmentContentRequest,
  updateQuestion,
  updateSection,
} from '../state';

describe('assessmentEditorState', () => {
  describe('createEmptySection', () => {
    it('creates a section with required fields', () => {
      const section = createEmptySection({
        assessmentId: 'assessment-1',
        position: 0,
      });

      expect(section.id).toBeTruthy();
      expect(section.title).toBeTruthy();
      expect(section.position).toBe(0);
      expect(section.questions).toEqual([]);
    });

    it('uses provided title', () => {
      const section = createEmptySection({
        assessmentId: 'assessment-1',
        position: 0,
        title: 'Custom title',
      });

      expect(section.title).toBe('Custom title');
    });
  });

  describe('createMcqQuestion', () => {
    it('creates MCQ question with correct kind and options', () => {
      const question = createMcqQuestion({
        assessmentId: 'assessment-1',
        position: 0,
      });

      expect(question.kind).toBe('MCQ');
      expect(question.options.length).toBeGreaterThanOrEqual(2);
      expect(question.gradingMode).toBe('AUTO');
      expect(question.answerKey).toBeUndefined();
    });
  });

  describe('createMultiSelectQuestion', () => {
    it('creates MULTI_SELECT question', () => {
      const question = createMultiSelectQuestion({
        assessmentId: 'assessment-1',
        position: 0,
      });

      expect(question.kind).toBe('MULTI_SELECT');
      expect(question.gradingMode).toBe('AUTO');
    });
  });

  describe('createTrueFalseQuestion', () => {
    it('creates TRUE_FALSE question with two options', () => {
      const question = createTrueFalseQuestion({
        assessmentId: 'assessment-1',
        position: 0,
      });

      expect(question.kind).toBe('TRUE_FALSE');
      expect(question.options).toHaveLength(2);
      expect(question.gradingMode).toBe('AUTO');
    });
  });

  describe('createShortAnswerQuestion', () => {
    it('creates SHORT_ANSWER question', () => {
      const question = createShortAnswerQuestion({
        assessmentId: 'assessment-1',
        position: 0,
      });

      expect(question.kind).toBe('SHORT_ANSWER');
      expect(question.answerKey).toBeUndefined();
    });
  });

  describe('createLongAnswerQuestion', () => {
    it('creates LONG_ANSWER question', () => {
      const question = createLongAnswerQuestion({
        assessmentId: 'assessment-1',
        position: 0,
      });

      expect(question.kind).toBe('LONG_ANSWER');
      expect(question.gradingMode).toBe('MANUAL');
      expect(question.answerKey).toBeUndefined();
    });
  });

  describe('createCodeQuestionPlaceholder', () => {
    it('creates CODE question', () => {
      const question = createCodeQuestionPlaceholder({
        assessmentId: 'assessment-1',
        position: 0,
      });

      expect(question.kind).toBe('CODE');
      expect(question.gradingMode).toBe('MANUAL');
      expect(question.answerKey).toBeUndefined();
    });
  });

  describe('createReadingPassageQuestion', () => {
    it('creates READING_PASSAGE question as zero-point context', () => {
      const question = createReadingPassageQuestion({
        assessmentId: 'assessment-1',
        position: 0,
      });

      expect(question.kind).toBe('READING_PASSAGE');
      expect(question.points).toBe(0);
      expect(question.gradingMode).toBe('MANUAL');
      expect(question.answerKey).toBeUndefined();
    });
  });

  describe('createFileUploadQuestion', () => {
    it('creates FILE_UPLOAD placeholder question', () => {
      const question = createFileUploadQuestion({
        assessmentId: 'assessment-1',
        position: 0,
      });

      expect(question.kind).toBe('FILE_UPLOAD');
      expect(question.gradingMode).toBe('MANUAL');
      expect(question.answerKey).toBeUndefined();
    });
  });

  describe('appendSection', () => {
    it('adds section to empty list', () => {
      const section = createEmptySection({
        assessmentId: 'a-1',
        position: 0,
      });

      const result = appendSection({ sections: [], section });
      expect(result).toHaveLength(1);
    });

    it('normalizes positions after append', () => {
      const sectionA = createEmptySection({ assessmentId: 'a-1', position: 5 });
      const sectionB = createEmptySection({ assessmentId: 'a-1', position: 0 });
      const sections = appendSection({ sections: [sectionA], section: sectionB });

      expect(sections[0]?.position).toBe(0);
      expect(sections[1]?.position).toBe(1);
    });
  });

  describe('appendQuestionToSection', () => {
    it('adds question to the correct section', () => {
      const section = createEmptySection({ assessmentId: 'a-1', position: 0 });
      const question = createMcqQuestion({
        assessmentId: 'a-1',
        position: 0,
      });

      const sections = appendQuestionToSection({
        sections: [section],
        sectionId: section.id,
        question,
      });

      expect(sections[0]?.questions).toHaveLength(1);
    });
  });

  describe('appendLooseQuestion', () => {
    it('adds question to loose questions list', () => {
      const question = createMcqQuestion({ assessmentId: 'a-1', position: 0 });
      const result = appendLooseQuestion({ questions: [], question });

      expect(result).toHaveLength(1);
    });
  });

  describe('updateQuestion', () => {
    it('patches question in loose questions', () => {
      const question = createMcqQuestion({ assessmentId: 'a-1', position: 0 });
      const questions = [question];

      const result = updateQuestion({
        sections: [],
        looseQuestions: questions,
        questionId: question.id,
        patch: { title: 'Updated title' },
      });

      expect(result.looseQuestions[0]?.title).toBe('Updated title');
    });

    it('patches question in section', () => {
      const question = createMcqQuestion({ assessmentId: 'a-1', position: 0 });
      const section = createEmptySection({ assessmentId: 'a-1', position: 0 });
      const sections = appendQuestionToSection({
        sections: [section],
        sectionId: section.id,
        question,
      });

      const result = updateQuestion({
        sections,
        looseQuestions: [],
        questionId: question.id,
        patch: { title: 'Updated in section' },
      });

      expect(result.sections[0]?.questions[0]?.title).toBe('Updated in section');
    });
  });

  describe('removeQuestion', () => {
    it('removes question from loose questions', () => {
      const question = createMcqQuestion({ assessmentId: 'a-1', position: 0 });
      const result = removeQuestion({
        sections: [],
        looseQuestions: [question],
        questionId: question.id,
      });

      expect(result.looseQuestions).toHaveLength(0);
    });
  });

  describe('removeSection', () => {
    it('removes section and renormalizes positions', () => {
      const s1 = createEmptySection({ assessmentId: 'a-1', position: 0 });
      const s2 = createEmptySection({ assessmentId: 'a-1', position: 1 });
      const sections = [s1, s2];

      const result = removeSection({ sections, sectionId: s1.id });
      expect(result).toHaveLength(1);
      expect(result[0]?.position).toBe(0);
    });
  });

  describe('normalizeSectionPositions', () => {
    it('resets positions to sequential 0-based', () => {
      const s1 = { ...createEmptySection({ assessmentId: 'a-1', position: 99 }) };
      const s2 = { ...createEmptySection({ assessmentId: 'a-1', position: 50 }) };
      const result = normalizeSectionPositions([s1, s2]);

      expect(result[0]?.position).toBe(0);
      expect(result[1]?.position).toBe(1);
    });
  });

  describe('normalizeQuestionPositions', () => {
    it('resets question positions to sequential', () => {
      const q1 = { ...createMcqQuestion({ assessmentId: 'a-1', position: 99 }) };
      const q2 = { ...createMcqQuestion({ assessmentId: 'a-1', position: 5 }) };
      const result = normalizeQuestionPositions([q1, q2]);

      expect(result[0]?.position).toBe(0);
      expect(result[1]?.position).toBe(1);
    });
  });

  describe('toReplaceAssessmentContentRequest', () => {
    it('returns sections and looseQuestions with backend-compatible answer keys', () => {
      const section = createEmptySection({ assessmentId: 'a-1', position: 0 });
      const question = createMcqQuestion({ assessmentId: 'a-1', position: 0 });
      const firstOption = question.options[0] as { id?: string } | undefined;
      const updatedQuestion = {
        ...question,
        answerKey: { correctOptionIds: [firstOption?.id ?? 'option-a'] },
      };

      const result = toReplaceAssessmentContentRequest({
        sections: [
          {
            ...section,
            questions: [updatedQuestion],
          },
        ],
        looseQuestions: [updatedQuestion],
        gradingRubrics: [],
        gradingRules: [],
      });

      expect(result.sections).toHaveLength(1);
      expect(result.looseQuestions).toHaveLength(1);
      expect(result.sections[0]?.questions[0]?.answerKey).toMatchObject({
        correctOptionIds: [firstOption?.id ?? 'option-a'],
      });
    });
  });

  describe('updateSection', () => {
    it('updates section title', () => {
      const section = createEmptySection({ assessmentId: 'a-1', position: 0 });
      const result = updateSection({
        sections: [section],
        sectionId: section.id,
        patch: { title: 'Renamed section' },
      });

      expect(result[0]?.title).toBe('Renamed section');
    });
  });
});
