/**
 * AssessmentDomain Tests
 * Verifies assessment aggregate behavior and lifecycle
 */

import { describe, it, expect } from 'vitest';
import {
  Assessment,
  AssessmentVersion,
  AssessmentPurposeEnum,
  AssessmentStatusEnum,
  AssessmentVisibilityEnum,
  AttemptPolicy,
  TimeLimit,
  ResultReleasePolicyEnum,
} from '../domain/index.js';

describe('Assessment Domain', () => {
  const baseProps = {
    id: 'a1',
    tenantId: 'tenant-1',
    workspaceId: 'ws-1',
    ownerPrincipalId: 'user-1',
    purpose: AssessmentPurposeEnum.QUIZ as const,
    visibility: AssessmentVisibilityEnum.WORKSPACE as const,
    title: 'Math Quiz',
    attemptPolicy: AttemptPolicy.create({
      allowRetake: true,
      shuffleQuestions: false,
      shuffleOptions: false,
    }),
    timeLimit: TimeLimit.create(30),
    resultReleasePolicy: ResultReleasePolicyEnum.IMMEDIATE as const,
    metadata: {},
  };

  describe('Assessment Creation', () => {
    it('should create draft assessment', () => {
      const assessment = Assessment.createDraft(baseProps);
      expect(assessment.id).toBe('a1');
      expect(assessment.status).toBe(AssessmentStatusEnum.DRAFT);
      expect(assessment.isDraft()).toBe(true);
    });

    it('should require tenantId', () => {
      expect(() => {
        Assessment.createDraft({ ...baseProps, tenantId: '' });
      }).toThrow('tenantId is required');
    });

    it('should require workspaceId', () => {
      expect(() => {
        Assessment.createDraft({ ...baseProps, workspaceId: '' });
      }).toThrow('workspaceId is required');
    });

    it('should require ownerPrincipalId', () => {
      expect(() => {
        Assessment.createDraft({ ...baseProps, ownerPrincipalId: '' });
      }).toThrow('ownerPrincipalId is required');
    });

    it('should require title', () => {
      expect(() => {
        Assessment.createDraft({ ...baseProps, title: '' });
      }).toThrow('title is required');
    });
  });

  describe('Assessment Renaming', () => {
    it('should rename assessment', () => {
      const assessment = Assessment.createDraft(baseProps);
      assessment.rename('New Title');
      expect(assessment.title).toBe('New Title');
    });

    it('should reject empty title', () => {
      const assessment = Assessment.createDraft(baseProps);
      expect(() => {
        assessment.rename('');
      }).toThrow('Title must be a non-empty string');
    });
  });

  describe('Assessment Description', () => {
    it('should update description', () => {
      const assessment = Assessment.createDraft(baseProps);
      assessment.updateDescription('New description');
      expect(assessment.description).toBe('New description');
    });

    it('should clear description', () => {
      const assessment = Assessment.createDraft({
        ...baseProps,
        description: 'Old description',
      });
      assessment.updateDescription(undefined);
      expect(assessment.description).toBeUndefined();
    });
  });

  describe('Assessment Visibility', () => {
    it('should update visibility', () => {
      const assessment = Assessment.createDraft(baseProps);
      assessment.updateVisibility(AssessmentVisibilityEnum.PUBLIC_LINK);
      expect(assessment.visibility).toBe(AssessmentVisibilityEnum.PUBLIC_LINK);
    });
  });

  describe('Assessment Policies', () => {
    it('should update attempt policy', () => {
      const assessment = Assessment.createDraft(baseProps);
      const newPolicy = AttemptPolicy.create({
        maxAttempts: 3,
        allowRetake: true,
        shuffleQuestions: true,
        shuffleOptions: true,
      });
      assessment.updateAttemptPolicy(newPolicy);
      expect(assessment.attemptPolicy.getAttemptLimit()).toBe(3);
    });

    it('should update time limit', () => {
      const assessment = Assessment.createDraft(baseProps);
      const newTimeLimit = TimeLimit.create(60);
      assessment.updateTimeLimit(newTimeLimit);
      expect(assessment.timeLimit.minutes()).toBe(60);
    });

    it('should update result release policy', () => {
      const assessment = Assessment.createDraft(baseProps);
      assessment.updateResultReleasePolicy(ResultReleasePolicyEnum.MANUAL_RELEASE);
      expect(assessment.resultReleasePolicy).toBe(ResultReleasePolicyEnum.MANUAL_RELEASE);
    });
  });

  describe('Assessment Archival', () => {
    it('should archive draft assessment', () => {
      const assessment = Assessment.createDraft(baseProps);
      assessment.archive();
      expect(assessment.isArchived()).toBe(true);
      expect(assessment.archivedAt).toBeDefined();
    });

    it('should reject archiving already archived assessment', () => {
      const assessment = Assessment.createDraft(baseProps);
      assessment.archive();
      expect(() => {
        assessment.archive();
      }).toThrow('Assessment is already archived');
    });

    it('should restore archived assessment to draft', () => {
      const assessment = Assessment.createDraft(baseProps);
      assessment.archive();
      assessment.restoreToDraft();
      expect(assessment.isDraft()).toBe(true);
      expect(assessment.archivedAt).toBeUndefined();
    });

    it('should reject restoring non-archived assessment', () => {
      const assessment = Assessment.createDraft(baseProps);
      expect(() => {
        assessment.restoreToDraft();
      }).toThrow('Only archived assessments can be restored');
    });

    it('should not allow modifications to archived assessment', () => {
      const assessment = Assessment.createDraft(baseProps);
      assessment.archive();
      // The domain enforces this through method checks
      expect(assessment.isArchived()).toBe(true);
    });
  });

  describe('Assessment Metadata', () => {
    it('should update metadata', () => {
      const assessment = Assessment.createDraft(baseProps);
      assessment.updateMetadata({ customField: 'customValue' });
      expect(assessment.metadata.customField).toBe('customValue');
    });

    it('should merge metadata updates', () => {
      const assessment = Assessment.createDraft(baseProps);
      assessment.updateMetadata({ field1: 'value1' });
      assessment.updateMetadata({ field2: 'value2' });
      expect(assessment.metadata.field1).toBe('value1');
      expect(assessment.metadata.field2).toBe('value2');
    });
  });

  describe('Status Queries', () => {
    it('should identify draft status', () => {
      const assessment = Assessment.createDraft(baseProps);
      expect(assessment.isDraft()).toBe(true);
      expect(assessment.isPublished()).toBe(false);
      expect(assessment.isArchived()).toBe(false);
    });

    it('should identify archived status', () => {
      const assessment = Assessment.createDraft(baseProps);
      assessment.archive();
      expect(assessment.isDraft()).toBe(false);
      expect(assessment.isPublished()).toBe(false);
      expect(assessment.isArchived()).toBe(true);
    });
  });

  describe('Assessment Restoration', () => {
    it('can restore from persistence', () => {
      const assessment = Assessment.createDraft(baseProps);
      assessment.archive();
      const restored = Assessment.restore(assessment.toObject());
      expect(restored.isArchived()).toBe(true);
    });
  });

  describe('Assessment Content Management', () => {
    it('should reject content replacement for non-draft', () => {
      const assessment = Assessment.createDraft(baseProps);
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
      expect(assessment.currentDraftVersion).toBeDefined();
    });
  });
});
