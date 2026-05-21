/**
 * Assessment Events Tests
 * Verifies domain event factories
 */

import { describe, it, expect } from 'vitest';
import {
  createAssessmentCreatedEvent,
  createAssessmentRenamedEvent,
  createAssessmentContentReplacedEvent,
  createAssessmentPublishedEvent,
  createAssessmentArchivedEvent,
  createAssessmentRestoredToDraftEvent,
  createAssessmentVersionCreatedEvent,
  createAssessmentVersionPublishedEvent,
  createAssessmentSnapshotCreatedEvent,
  createAssessmentQuestionAddedEvent,
  createAssessmentQuestionUpdatedEvent,
  createAssessmentGradingRuleUpdatedEvent,
  createAssessmentResultReleasedEvent,
  createAssessmentResultViewedEvent,
} from '../domain/index.js';

describe('Assessment Domain Events', () => {
  const tenantId = 'tenant-1';
  const workspaceId = 'ws-1';
  const assessmentId = 'a1';

  describe('Base Event Properties', () => {
    it('should have stable event name', () => {
      const event = createAssessmentCreatedEvent(assessmentId, tenantId, workspaceId, {
        title: 'Test',
        purpose: 'EXAM',
        ownerPrincipalId: 'user-1',
      });

      expect(event.eventName).toBe('assessment.created');
    });

    it('should have eventVersion 1', () => {
      const event = createAssessmentCreatedEvent(assessmentId, tenantId, workspaceId, {
        title: 'Test',
        purpose: 'EXAM',
        ownerPrincipalId: 'user-1',
      });

      expect(event.eventVersion).toBe(1);
    });

    it('should preserve tenantId', () => {
      const event = createAssessmentCreatedEvent(assessmentId, tenantId, workspaceId, {
        title: 'Test',
        purpose: 'EXAM',
        ownerPrincipalId: 'user-1',
      });

      expect(event.tenantId).toBe(tenantId);
    });

    it('should preserve workspaceId', () => {
      const event = createAssessmentCreatedEvent(assessmentId, tenantId, workspaceId, {
        title: 'Test',
        purpose: 'EXAM',
        ownerPrincipalId: 'user-1',
      });

      expect(event.workspaceId).toBe(workspaceId);
    });

    it('should use aggregateId', () => {
      const event = createAssessmentCreatedEvent(assessmentId, tenantId, workspaceId, {
        title: 'Test',
        purpose: 'EXAM',
        ownerPrincipalId: 'user-1',
      });

      expect(event.aggregateId).toBe(assessmentId);
    });

    it('should have occurredAt', () => {
      const event = createAssessmentCreatedEvent(assessmentId, tenantId, workspaceId, {
        title: 'Test',
        purpose: 'EXAM',
        ownerPrincipalId: 'user-1',
      });

      expect(event.occurredAt).toBeInstanceOf(Date);
    });

    it('should reject empty tenantId', () => {
      expect(() => {
        createAssessmentCreatedEvent(assessmentId, '', workspaceId, {
          title: 'Test',
          purpose: 'EXAM',
          ownerPrincipalId: 'user-1',
        });
      }).toThrow('tenantId cannot be empty');
    });

    it('should reject empty workspaceId', () => {
      expect(() => {
        createAssessmentCreatedEvent(assessmentId, tenantId, '', {
          title: 'Test',
          purpose: 'EXAM',
          ownerPrincipalId: 'user-1',
        });
      }).toThrow('workspaceId cannot be empty');
    });
  });

  describe('Event Factories', () => {
    it('assessment.created has correct payload', () => {
      const event = createAssessmentCreatedEvent(assessmentId, tenantId, workspaceId, {
        title: 'My Exam',
        purpose: 'EXAM',
        ownerPrincipalId: 'user-1',
      });

      expect(event.payload.title).toBe('My Exam');
      expect(event.payload.purpose).toBe('EXAM');
      expect(event.payload.ownerPrincipalId).toBe('user-1');
    });

    it('assessment.renamed has correct payload', () => {
      const event = createAssessmentRenamedEvent(assessmentId, tenantId, workspaceId, {
        previousTitle: 'Old Title',
        newTitle: 'New Title',
      });

      expect(event.eventName).toBe('assessment.renamed');
      expect(event.payload.previousTitle).toBe('Old Title');
      expect(event.payload.newTitle).toBe('New Title');
    });

    it('assessment.content_replaced has correct payload', () => {
      const event = createAssessmentContentReplacedEvent(assessmentId, tenantId, workspaceId, {
        versionNumber: 1,
        questionCount: 5,
        sectionCount: 2,
      });

      expect(event.eventName).toBe('assessment.content_replaced');
      expect(event.payload.versionNumber).toBe(1);
      expect(event.payload.questionCount).toBe(5);
    });

    it('assessment.published has correct payload', () => {
      const event = createAssessmentPublishedEvent(assessmentId, tenantId, workspaceId, {
        draftVersionNumber: 1,
        snapshotVersionNumber: 1,
        publishedByPrincipalId: 'user-1',
        questionCount: 10,
        totalPoints: 100,
      });

      expect(event.eventName).toBe('assessment.published');
      expect(event.payload.draftVersionNumber).toBe(1);
      expect(event.payload.totalPoints).toBe(100);
    });

    it('assessment.archived has correct payload', () => {
      const event = createAssessmentArchivedEvent(assessmentId, tenantId, workspaceId, {
        previousStatus: 'PUBLISHED',
      });

      expect(event.eventName).toBe('assessment.archived');
      expect(event.payload.previousStatus).toBe('PUBLISHED');
    });

    it('assessment.restored_to_draft has correct payload', () => {
      const now = new Date();
      const event = createAssessmentRestoredToDraftEvent(assessmentId, tenantId, workspaceId, {
        previousStatus: 'ARCHIVED',
        restoredAt: now,
      });

      expect(event.eventName).toBe('assessment.restored_to_draft');
      expect(event.payload.previousStatus).toBe('ARCHIVED');
      expect(event.payload.restoredAt).toBe(now);
    });

    it('assessment.version.created has correct payload', () => {
      const event = createAssessmentVersionCreatedEvent(assessmentId, tenantId, workspaceId, {
        versionNumber: 2,
        status: 'DRAFT',
        createdByPrincipalId: 'user-1',
      });

      expect(event.eventName).toBe('assessment.version.created');
      expect(event.payload.versionNumber).toBe(2);
    });

    it('assessment.version.published has correct payload', () => {
      const event = createAssessmentVersionPublishedEvent(assessmentId, tenantId, workspaceId, {
        draftVersionNumber: 1,
        publishedByPrincipalId: 'user-1',
      });

      expect(event.eventName).toBe('assessment.version.published');
    });

    it('assessment.snapshot.created has correct payload', () => {
      const event = createAssessmentSnapshotCreatedEvent(assessmentId, tenantId, workspaceId, {
        snapshotId: 'snap-1',
        versionNumber: 1,
        publishedByPrincipalId: 'user-1',
        questionCount: 5,
      });

      expect(event.eventName).toBe('assessment.snapshot.created');
      expect(event.payload.snapshotId).toBe('snap-1');
    });

    it('assessment.question.added has correct payload', () => {
      const event = createAssessmentQuestionAddedEvent(assessmentId, tenantId, workspaceId, {
        questionId: 'q1',
        kind: 'MCQ',
        title: 'Question',
        points: 5,
        sectionId: 's1',
        position: 0,
      });

      expect(event.eventName).toBe('assessment.question.added');
      expect(event.payload.questionId).toBe('q1');
      expect(event.payload.kind).toBe('MCQ');
    });

    it('assessment.question.updated has correct payload', () => {
      const event = createAssessmentQuestionUpdatedEvent(assessmentId, tenantId, workspaceId, {
        questionId: 'q1',
        sectionId: 's1',
        updates: { title: 'New Title' },
      });

      expect(event.eventName).toBe('assessment.question.updated');
      expect(event.payload.updates.title).toBe('New Title');
    });

    it('assessment.grading_rule.updated has correct payload', () => {
      const event = createAssessmentGradingRuleUpdatedEvent(assessmentId, tenantId, workspaceId, {
        ruleId: 'rule-1',
        ruleType: 'EXACT_MATCH',
        mode: 'AUTO',
        questionId: 'q1',
      });

      expect(event.eventName).toBe('assessment.grading_rule.updated');
      expect(event.payload.ruleType).toBe('EXACT_MATCH');
    });

    it('assessment.result.released has correct payload', () => {
      const event = createAssessmentResultReleasedEvent('attempt-1', tenantId, workspaceId, {
        attemptId: 'attempt-1',
        assessmentId: 'assessment-1',
        snapshotId: 'snapshot-1',
        learnerPrincipalId: 'learner-1',
        score: 4,
        maxScore: 5,
        releasedAt: '2026-01-01T00:00:00.000Z',
      });

      expect(event.eventName).toBe('assessment.result.released');
      expect(event.aggregateId).toBe('attempt-1');
      expect(event.payload.score).toBe(4);
    });

    it('assessment.result.viewed has correct payload', () => {
      const event = createAssessmentResultViewedEvent('attempt-1', tenantId, workspaceId, {
        attemptId: 'attempt-1',
        assessmentId: 'assessment-1',
        snapshotId: 'snapshot-1',
        learnerPrincipalId: 'learner-1',
        releasedAt: '2026-01-01T00:00:00.000Z',
      });

      expect(event.eventName).toBe('assessment.result.viewed');
      expect(event.aggregateId).toBe('attempt-1');
    });
  });
});
