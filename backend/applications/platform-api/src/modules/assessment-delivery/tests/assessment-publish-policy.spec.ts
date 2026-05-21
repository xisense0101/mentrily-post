/**
 * Assessment Publish Policy Tests
 */

import { describe, it, expect } from 'vitest';
import {
  Assessment,
  AssessmentVersion,
  AssessmentQuestion,
  QuestionOption,
  QuestionPoints,
  QuestionKindEnum,
  GradingModeEnum,
  AssessmentPurposeEnum,
  AssessmentVisibilityEnum,
  AttemptPolicy,
  TimeLimit,
  ResultReleasePolicyEnum,
  AssessmentPublishPolicyService,
  QuestionValidationPolicyService,
} from '../domain/index.js';

describe('AssessmentPublishPolicy', () => {
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

  const baseAssessment = {
    id: 'a1',
    tenantId: 'tenant-1',
    workspaceId: 'ws-1',
    ownerPrincipalId: 'user-1',
    purpose: AssessmentPurposeEnum.EXAM as const,
    visibility: AssessmentVisibilityEnum.WORKSPACE as const,
    title: 'Exam',
    attemptPolicy: AttemptPolicy.create({
      allowRetake: true,
      shuffleQuestions: false,
      shuffleOptions: false,
    }),
    timeLimit: TimeLimit.create(30),
    resultReleasePolicy: ResultReleasePolicyEnum.IMMEDIATE as const,
    metadata: {},
  };

  const service = new AssessmentPublishPolicyService(new QuestionValidationPolicyService());

  it('should allow publishing valid draft assessment', () => {
    const assessment = Assessment.createDraft(baseAssessment);
    const version = AssessmentVersion.createDraft({
      id: 'v1',
      assessmentId: 'a1',
      versionNumber: 1,
      sections: [],
      looseQuestions: [createQuestion('q1')],
      createdAt: new Date(),
      createdByPrincipalId: 'user-1',
    });
    assessment.replaceDraftContent(version);

    const result = service.canPublish(assessment);
    expect(result.allowed).toBe(true);
  });

  it('should reject archived assessment', () => {
    const assessment = Assessment.createDraft(baseAssessment);
    assessment.archive();

    const result = service.canPublish(assessment);
    expect(result.allowed).toBe(false);
    expect(result.reason?.toLowerCase()).toContain('archived');
  });

  it('should reject without draft version', () => {
    const assessment = Assessment.createDraft(baseAssessment);

    const result = service.canPublish(assessment);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('draft version');
  });

  it('should reject empty assessment', () => {
    const assessment = Assessment.createDraft(baseAssessment);
    const version = AssessmentVersion.createDraft({
      id: 'v1',
      assessmentId: 'a1',
      versionNumber: 1,
      sections: [],
      looseQuestions: [],
      createdAt: new Date(),
      createdByPrincipalId: 'user-1',
    });
    assessment.replaceDraftContent(version);

    const result = service.canPublish(assessment);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('at least one question');
  });

  it('should reject with invalid questions', () => {
    expect(() =>
      AssessmentQuestion.create({
        id: 'q1',
        assessmentId: 'a1',
        kind: QuestionKindEnum.MCQ,
        title: 'Q',
        prompt: { text: 'Q' },
        options: [QuestionOption.create({ id: 'opt1', label: 'A', value: 'a', isCorrect: false })],
        points: QuestionPoints.create(1),
        gradingMode: GradingModeEnum.AUTO,
        position: 0,
        metadata: {},
      }),
    ).toThrow('MCQ must have at least 2 options');
  });

  it('should reject exam with zero points', () => {
    const assessment = Assessment.createDraft(baseAssessment);

    const zeroPointQuestion = AssessmentQuestion.create({
      id: 'q1',
      assessmentId: 'a1',
      kind: QuestionKindEnum.MCQ,
      title: 'Q',
      prompt: { text: 'Q' },
      options: [
        QuestionOption.create({ id: 'opt1', label: 'A', value: 'a', isCorrect: true }),
        QuestionOption.create({ id: 'opt2', label: 'B', value: 'b', isCorrect: false }),
      ],
      points: QuestionPoints.create(0),
      gradingMode: GradingModeEnum.AUTO,
      position: 0,
      metadata: {},
    });

    const version = AssessmentVersion.createDraft({
      id: 'v1',
      assessmentId: 'a1',
      versionNumber: 1,
      sections: [],
      looseQuestions: [zeroPointQuestion],
      createdAt: new Date(),
      createdByPrincipalId: 'user-1',
    });
    assessment.replaceDraftContent(version);

    const result = service.canPublish(assessment);
    expect(result.allowed).toBe(false);
  });

  it('should allow practice assessment with zero points', () => {
    const practiceAssessment = {
      ...baseAssessment,
      purpose: AssessmentPurposeEnum.PRACTICE as const,
    };

    const assessment = Assessment.createDraft(practiceAssessment);

    const zeroPointQuestion = AssessmentQuestion.create({
      id: 'q1',
      assessmentId: 'a1',
      kind: QuestionKindEnum.MCQ,
      title: 'Q',
      prompt: { text: 'Q' },
      options: [
        QuestionOption.create({ id: 'opt1', label: 'A', value: 'a', isCorrect: true }),
        QuestionOption.create({ id: 'opt2', label: 'B', value: 'b', isCorrect: false }),
      ],
      points: QuestionPoints.create(0),
      gradingMode: GradingModeEnum.AUTO,
      position: 0,
      metadata: {},
    });

    const version = AssessmentVersion.createDraft({
      id: 'v1',
      assessmentId: 'a1',
      versionNumber: 1,
      sections: [],
      looseQuestions: [zeroPointQuestion],
      createdAt: new Date(),
      createdByPrincipalId: 'user-1',
    });
    assessment.replaceDraftContent(version);

    const result = service.canPublish(assessment);
    expect(result.allowed).toBe(true);
  });
});
