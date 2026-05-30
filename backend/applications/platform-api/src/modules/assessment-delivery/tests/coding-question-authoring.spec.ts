import { describe, it, expect } from 'vitest';
import {
  AssessmentQuestion,
  QuestionPoints,
  QuestionKindEnum,
  GradingModeEnum,
  QuestionAnswerKey,
  AssessmentPublishedSnapshot,
} from '../domain/index.js';
import { mapSnapshotToResponse } from '../application/mappers/assessment-snapshot-response.mapper.js';

describe('Coding Question Authoring and Test Case Management', () => {
  const baseProps = {
    id: 'q1',
    assessmentId: 'a1',
    kind: QuestionKindEnum.CODE as const,
    title: 'Code Question',
    prompt: { type: 'text', content: 'Write code' },
    options: [],
    points: QuestionPoints.create(10),
    gradingMode: GradingModeEnum.AUTO,
    position: 0,
    metadata: {},
  };

  const validCodingConfig = {
    allowedLanguages: ['javascript', 'python'],
    starterCodeByLanguage: {
      javascript: 'console.log("hello");',
      python: 'print("hello")',
    },
    publicSampleTestCases: [{ id: 'sample-1', input: '1', expectedOutput: '1', weight: 1 }],
    publicGradedTestCases: [{ id: 'public-1', input: '2', expectedOutput: '2', weight: 2 }],
    hiddenGradedTestCases: [{ id: 'hidden-1', input: '3', expectedOutput: '3', weight: 3 }],
  };

  describe('Value Object Creation', () => {
    it('should successfully create QuestionAnswerKey with valid codingConfig', () => {
      const key = QuestionAnswerKey.create({
        codingConfig: validCodingConfig,
      });
      expect(key.codingConfig).toEqual(validCodingConfig);
      expect(key.hasCodeOutput()).toBe(true);
    });
  });

  describe('Validation Constraints', () => {
    it('should accept valid coding configuration', () => {
      const question = AssessmentQuestion.create({
        ...baseProps,
        answerKey: QuestionAnswerKey.create({
          codingConfig: validCodingConfig,
        }),
      });
      expect(question.answerKey?.codingConfig).toEqual(validCodingConfig);
    });

    it('should reject empty allowed languages', () => {
      expect(() => {
        AssessmentQuestion.create({
          ...baseProps,
          answerKey: QuestionAnswerKey.create({
            codingConfig: {
              ...validCodingConfig,
              allowedLanguages: [],
            },
          }),
        });
      }).toThrow('allowedLanguages must be a non-empty array');
    });

    it('should reject invalid language IDs', () => {
      expect(() => {
        AssessmentQuestion.create({
          ...baseProps,
          answerKey: QuestionAnswerKey.create({
            codingConfig: {
              ...validCodingConfig,
              allowedLanguages: ['javascript', 'rust'],
            },
          }),
        });
      }).toThrow('Invalid language ID: rust');
    });

    it('should reject negative test case weight', () => {
      expect(() => {
        AssessmentQuestion.create({
          ...baseProps,
          answerKey: QuestionAnswerKey.create({
            codingConfig: {
              ...validCodingConfig,
              publicSampleTestCases: [
                { id: 'sample-1', input: '1', expectedOutput: '1', weight: -5 },
              ],
            },
          }),
        });
      }).toThrow('Test case weight must be a non-negative number');
    });

    it('should reject total test cases exceeding 50', () => {
      const manyTests = Array.from({ length: 51 }, (_, i) => ({
        id: `test-${i}`,
        input: 'a',
        expectedOutput: 'b',
      }));
      expect(() => {
        AssessmentQuestion.create({
          ...baseProps,
          answerKey: QuestionAnswerKey.create({
            codingConfig: {
              ...validCodingConfig,
              publicSampleTestCases: manyTests,
              publicGradedTestCases: [],
              hiddenGradedTestCases: [],
            },
          }),
        });
      }).toThrow('Total number of test cases must not exceed 50');
    });

    it('should reject test case input exceeding 100 KB limit', () => {
      const largeInput = 'a'.repeat(102401);
      expect(() => {
        AssessmentQuestion.create({
          ...baseProps,
          answerKey: QuestionAnswerKey.create({
            codingConfig: {
              ...validCodingConfig,
              publicSampleTestCases: [{ id: 'sample-1', input: largeInput, expectedOutput: '1' }],
            },
          }),
        });
      }).toThrow('Test case input exceeds 100 KB limit');
    });

    it('should reject test case expectedOutput exceeding 100 KB limit', () => {
      const largeOutput = 'a'.repeat(102401);
      expect(() => {
        AssessmentQuestion.create({
          ...baseProps,
          answerKey: QuestionAnswerKey.create({
            codingConfig: {
              ...validCodingConfig,
              publicSampleTestCases: [{ id: 'sample-1', input: '1', expectedOutput: largeOutput }],
            },
          }),
        });
      }).toThrow('Test case expectedOutput exceeds 100 KB limit');
    });

    it('should reject if allowedLanguages has more than 4 items', () => {
      expect(() => {
        AssessmentQuestion.create({
          ...baseProps,
          answerKey: QuestionAnswerKey.create({
            codingConfig: {
              ...validCodingConfig,
              allowedLanguages: ['javascript', 'python', 'cpp', 'java', 'invalid' as any],
            },
          }),
        });
      }).toThrow('Maximum 4 allowed languages');
    });

    it('should reject if starterCodeByLanguage contains a key not in allowedLanguages', () => {
      expect(() => {
        AssessmentQuestion.create({
          ...baseProps,
          answerKey: QuestionAnswerKey.create({
            codingConfig: {
              ...validCodingConfig,
              starterCodeByLanguage: {
                javascript: '// JS',
                cpp: '// C++', // not in allowedLanguages
              },
              allowedLanguages: ['javascript'],
            },
          }),
        });
      }).toThrow('Starter code key cpp is not in allowedLanguages');
    });

    it('should reject if total starter code exceeds 50 KB', () => {
      const hugeCode = 'a'.repeat(51201);
      expect(() => {
        AssessmentQuestion.create({
          ...baseProps,
          answerKey: QuestionAnswerKey.create({
            codingConfig: {
              ...validCodingConfig,
              starterCodeByLanguage: {
                javascript: hugeCode,
              },
              allowedLanguages: ['javascript'],
            },
          }),
        });
      }).toThrow('Total starter code size must not exceed 50 KB');
    });

    it('should reject if public sample test cases exceed 10', () => {
      const manySamples = Array.from({ length: 11 }, (_, i) => ({
        id: `sample-${i}`,
        input: 'a',
        expectedOutput: 'b',
      }));
      expect(() => {
        AssessmentQuestion.create({
          ...baseProps,
          answerKey: QuestionAnswerKey.create({
            codingConfig: {
              ...validCodingConfig,
              publicSampleTestCases: manySamples,
            },
          }),
        });
      }).toThrow('Public sample test cases must not exceed 10');
    });

    it('should reject if public graded test cases exceed 20', () => {
      const manyPublicGraded = Array.from({ length: 21 }, (_, i) => ({
        id: `public-${i}`,
        input: 'a',
        expectedOutput: 'b',
        weight: 1,
      }));
      expect(() => {
        AssessmentQuestion.create({
          ...baseProps,
          answerKey: QuestionAnswerKey.create({
            codingConfig: {
              ...validCodingConfig,
              publicGradedTestCases: manyPublicGraded,
            },
          }),
        });
      }).toThrow('Public graded test cases must not exceed 20');
    });

    it('should reject if hidden graded test cases exceed 20', () => {
      const manyHiddenGraded = Array.from({ length: 21 }, (_, i) => ({
        id: `hidden-${i}`,
        input: 'a',
        expectedOutput: 'b',
        weight: 1,
      }));
      expect(() => {
        AssessmentQuestion.create({
          ...baseProps,
          answerKey: QuestionAnswerKey.create({
            codingConfig: {
              ...validCodingConfig,
              hiddenGradedTestCases: manyHiddenGraded,
            },
          }),
        });
      }).toThrow('Hidden graded test cases must not exceed 20');
    });

    it('should reject if weight exceeds 1000', () => {
      expect(() => {
        AssessmentQuestion.create({
          ...baseProps,
          answerKey: QuestionAnswerKey.create({
            codingConfig: {
              ...validCodingConfig,
              publicGradedTestCases: [
                { id: 'public-1', input: '1', expectedOutput: '1', weight: 1001 },
              ],
            },
          }),
        });
      }).toThrow('Test case weight exceeds 1000 limit');
    });

    it('should reject if AUTO grading mode is set but codingConfig is missing', () => {
      expect(() => {
        AssessmentQuestion.create({
          ...baseProps,
          gradingMode: GradingModeEnum.AUTO,
        });
      }).toThrow('Auto-graded coding questions must have a coding configuration');
    });

    it('should reject if AUTO grading mode has no graded test cases', () => {
      expect(() => {
        AssessmentQuestion.create({
          ...baseProps,
          answerKey: QuestionAnswerKey.create({
            codingConfig: {
              ...validCodingConfig,
              publicGradedTestCases: [],
              hiddenGradedTestCases: [],
            },
          }),
        });
      }).toThrow('Auto-graded coding questions require at least one graded test case');
    });

    it('should reject duplicate test case IDs across arrays', () => {
      expect(() => {
        AssessmentQuestion.create({
          ...baseProps,
          answerKey: QuestionAnswerKey.create({
            codingConfig: {
              ...validCodingConfig,
              publicSampleTestCases: [{ id: 'dup-1', input: '', expectedOutput: '' }],
              publicGradedTestCases: [{ id: 'dup-1', input: '', expectedOutput: '', weight: 1 }],
            },
          }),
        });
      }).toThrow('Duplicate test case ID: dup-1');
    });
  });

  describe('Learner Snapshot Privacy Boundary', () => {
    it('should strip public graded and hidden graded test cases from learner snapshot', () => {
      const question = AssessmentQuestion.create({
        ...baseProps,
        answerKey: QuestionAnswerKey.create({
          codingConfig: validCodingConfig,
        }),
      });

      const snapshot = AssessmentPublishedSnapshot.restore({
        id: 'snap-1',
        assessmentId: 'a1',
        versionId: 'v1',
        versionNumber: 1,
        sections: [],
        looseQuestions: [question],
        publishedByPrincipalId: 'p1',
        publishedAt: new Date(),
        createdAt: new Date(),
      });

      const response = mapSnapshotToResponse(snapshot);
      const mappedQuestion = response.looseQuestions[0]!;
      expect(mappedQuestion.answerKey).toBeDefined();

      const codingLearnerConfig = (mappedQuestion.answerKey as any).codingLearnerConfig;
      expect(codingLearnerConfig).toBeDefined();
      expect(codingLearnerConfig.allowedLanguages).toEqual(['javascript', 'python']);
      expect(codingLearnerConfig.starterCodeByLanguage).toEqual(
        validCodingConfig.starterCodeByLanguage,
      );

      // Public samples are preserved
      expect(codingLearnerConfig.publicSampleTestCases).toHaveLength(1);
      expect(codingLearnerConfig.publicSampleTestCases[0]).toEqual({
        id: 'sample-1',
        input: '1',
        expectedOutput: '1',
        weight: 1,
      });

      // Public graded and hidden graded, as well as codingConfig, are omitted completely
      expect((mappedQuestion.answerKey as any).codingConfig).toBeUndefined();
      expect(codingLearnerConfig.publicGradedTestCases).toBeUndefined();
      expect(codingLearnerConfig.hiddenGradedTestCases).toBeUndefined();
    });
  });
});
