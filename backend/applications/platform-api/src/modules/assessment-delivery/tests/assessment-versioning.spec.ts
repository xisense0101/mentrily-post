/**
 * AssessmentVersioning Tests
 * Verifies version and snapshot management
 */

import { describe, it, expect } from 'vitest';
import {
  AssessmentVersion,
  AssessmentPublishedSnapshot,
  AssessmentSection,
  AssessmentQuestion,
  QuestionOption,
  QuestionPoints,
  QuestionKindEnum,
  GradingModeEnum,
  AssessmentVersioningPolicyService,
} from '../domain/index.js';

describe('Assessment Versioning', () => {
  const createQuestion = (id: string, title: string) => {
    return AssessmentQuestion.create({
      id,
      assessmentId: 'a1',
      kind: QuestionKindEnum.MCQ,
      title,
      prompt: { text: 'Question' },
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

  const createSection = (id: string, title: string) => {
    return AssessmentSection.create({
      id,
      assessmentId: 'a1',
      title,
      position: 0,
      questions: [],
      metadata: {},
    });
  };

  describe('Draft Version Creation', () => {
    it('should create draft version', () => {
      const version = AssessmentVersion.createDraft({
        id: 'v1',
        assessmentId: 'a1',
        versionNumber: 1,
        sections: [],
        looseQuestions: [],
        createdAt: new Date(),
        createdByPrincipalId: 'user-1',
      });

      expect(version.isDraft()).toBe(true);
      expect(version.versionNumber).toBe(1);
    });

    it('should require version number >= 1', () => {
      expect(() => {
        AssessmentVersion.createDraft({
          id: 'v1',
          assessmentId: 'a1',
          versionNumber: 0,
          sections: [],
          looseQuestions: [],
          createdAt: new Date(),
          createdByPrincipalId: 'user-1',
        });
      }).toThrow('Version number must be >= 1');
    });
  });

  describe('Version Content Management', () => {
    it('should allow content replacement in draft', () => {
      const version = AssessmentVersion.createDraft({
        id: 'v1',
        assessmentId: 'a1',
        versionNumber: 1,
        sections: [],
        looseQuestions: [],
        createdAt: new Date(),
        createdByPrincipalId: 'user-1',
      });

      const section = createSection('s1', 'Section 1');
      version.replaceContent([section], []);

      expect(version.sections.length).toBe(1);
    });

    it('should reject content replacement for published version', () => {
      const version = AssessmentVersion.createDraft({
        id: 'v1',
        assessmentId: 'a1',
        versionNumber: 1,
        sections: [],
        looseQuestions: [],
        createdAt: new Date(),
        createdByPrincipalId: 'user-1',
      });

      version.publishSnapshot();

      expect(() => {
        version.replaceContent([], []);
      }).toThrow('Only draft versions can have their content replaced');
    });
  });

  describe('Publishing', () => {
    it('should publish draft version', () => {
      const version = AssessmentVersion.createDraft({
        id: 'v1',
        assessmentId: 'a1',
        versionNumber: 1,
        sections: [],
        looseQuestions: [createQuestion('q1', 'Q1')],
        createdAt: new Date(),
        createdByPrincipalId: 'user-1',
      });

      version.publishSnapshot();

      expect(version.isPublished()).toBe(true);
      expect(version.publishedAt).toBeDefined();
    });

    it('should reject publishing non-draft version', () => {
      const version = AssessmentVersion.createDraft({
        id: 'v1',
        assessmentId: 'a1',
        versionNumber: 1,
        sections: [],
        looseQuestions: [],
        createdAt: new Date(),
        createdByPrincipalId: 'user-1',
      });

      version.publishSnapshot();

      expect(() => {
        version.publishSnapshot();
      }).toThrow('Only draft versions can be published');
    });
  });

  describe('Snapshot Creation', () => {
    it('should create snapshot from published version', () => {
      const question = createQuestion('q1', 'Q1');
      const version = AssessmentVersion.createDraft({
        id: 'v1',
        assessmentId: 'a1',
        versionNumber: 1,
        sections: [],
        looseQuestions: [question],
        createdAt: new Date(),
        createdByPrincipalId: 'user-1',
      });

      version.publishSnapshot();

      const snapshot = AssessmentPublishedSnapshot.createFromVersion(version, {
        id: 'snap1',
        assessmentId: 'a1',
        publishedByPrincipalId: 'user-1',
        createdAt: new Date(),
      });

      expect(snapshot.versionNumber).toBe(1);
      expect(snapshot.getQuestionCount()).toBe(1);
    });

    it('should reject snapshot from non-published version', () => {
      const version = AssessmentVersion.createDraft({
        id: 'v1',
        assessmentId: 'a1',
        versionNumber: 1,
        sections: [],
        looseQuestions: [],
        createdAt: new Date(),
        createdByPrincipalId: 'user-1',
      });

      expect(() => {
        AssessmentPublishedSnapshot.createFromVersion(version, {
          id: 'snap1',
          assessmentId: 'a1',
          publishedByPrincipalId: 'user-1',
          createdAt: new Date(),
        });
      }).toThrow('Source version must be in PUBLISHED_SNAPSHOT status');
    });
  });

  describe('Snapshot Immutability', () => {
    it('snapshot is immutable', () => {
      const version = AssessmentVersion.createDraft({
        id: 'v1',
        assessmentId: 'a1',
        versionNumber: 1,
        sections: [],
        looseQuestions: [createQuestion('q1', 'Q1')],
        createdAt: new Date(),
        createdByPrincipalId: 'user-1',
      });

      version.publishSnapshot();

      const snapshot = AssessmentPublishedSnapshot.createFromVersion(version, {
        id: 'snap1',
        assessmentId: 'a1',
        publishedByPrincipalId: 'user-1',
        createdAt: new Date(),
      });

      expect(snapshot.isImmutable).toBe(true);
    });
  });

  describe('Superseding', () => {
    it('should mark published snapshot as superseded', () => {
      const version = AssessmentVersion.createDraft({
        id: 'v1',
        assessmentId: 'a1',
        versionNumber: 1,
        sections: [],
        looseQuestions: [],
        createdAt: new Date(),
        createdByPrincipalId: 'user-1',
      });

      version.publishSnapshot();
      version.markSuperseded();

      expect(version.isSuperseded()).toBe(true);
      expect(version.supersededAt).toBeDefined();
    });

    it('should reject superseding draft', () => {
      const version = AssessmentVersion.createDraft({
        id: 'v1',
        assessmentId: 'a1',
        versionNumber: 1,
        sections: [],
        looseQuestions: [],
        createdAt: new Date(),
        createdByPrincipalId: 'user-1',
      });

      expect(() => {
        version.markSuperseded();
      }).toThrow('Only published snapshots can be marked as superseded');
    });
  });

  describe('Question Count', () => {
    it('should count questions from sections and loose', () => {
      const section = createSection('s1', 'Section 1');
      section.addQuestion(createQuestion('q1', 'Q1'));
      section.addQuestion(createQuestion('q2', 'Q2'));

      const version = AssessmentVersion.createDraft({
        id: 'v1',
        assessmentId: 'a1',
        versionNumber: 1,
        sections: [section],
        looseQuestions: [createQuestion('q3', 'Q3')],
        createdAt: new Date(),
        createdByPrincipalId: 'user-1',
      });

      expect(version.getQuestionCount()).toBe(3);
    });
  });

  describe('Versioning Policy Service', () => {
    const service = new AssessmentVersioningPolicyService();

    it('should start numbering at 1', () => {
      const nextNum = service.nextVersionNumber([]);
      expect(nextNum).toBe(1);
    });

    it('should increment from max version', () => {
      const v1 = AssessmentVersion.createDraft({
        id: 'v1',
        assessmentId: 'a1',
        versionNumber: 1,
        sections: [],
        looseQuestions: [],
        createdAt: new Date(),
        createdByPrincipalId: 'user-1',
      });

      const v2 = AssessmentVersion.createDraft({
        id: 'v2',
        assessmentId: 'a1',
        versionNumber: 2,
        sections: [],
        looseQuestions: [],
        createdAt: new Date(),
        createdByPrincipalId: 'user-1',
      });

      const nextNum = service.nextVersionNumber([v1, v2]);
      expect(nextNum).toBe(3);
    });

    it('should allow replacing draft version', () => {
      const version = AssessmentVersion.createDraft({
        id: 'v1',
        assessmentId: 'a1',
        versionNumber: 1,
        sections: [],
        looseQuestions: [],
        createdAt: new Date(),
        createdByPrincipalId: 'user-1',
      });

      const result = service.canReplaceDraft(version);
      expect(result.allowed).toBe(true);
    });

    it('should reject replacing published version', () => {
      const version = AssessmentVersion.createDraft({
        id: 'v1',
        assessmentId: 'a1',
        versionNumber: 1,
        sections: [],
        looseQuestions: [],
        createdAt: new Date(),
        createdByPrincipalId: 'user-1',
      });

      version.publishSnapshot();

      const result = service.canReplaceDraft(version);
      expect(result.allowed).toBe(false);
    });
  });
});
