import { describe, expect, it } from 'vitest';
import { AnalyticsEventNormalizerService } from '../application/analytics-event-normalizer.service.js';

describe('AnalyticsEventNormalizerService', () => {
  const service = new AnalyticsEventNormalizerService();

  it('maps learning events into normalized activity items', () => {
    const normalized = service.normalize({
      id: 'row-1',
      eventId: 'event-1',
      eventName: 'learning.course.created',
      workspaceId: 'workspace-1',
      occurredAt: new Date('2026-05-25T10:00:00.000Z'),
      payload: {
        courseId: 'course-1',
        rawAnswer: { hidden: true },
        storageKey: 'private-key',
      },
    });

    expect(normalized).toEqual({
      id: 'event-1',
      category: 'LEARNING',
      type: 'learning.course.created',
      subjectType: 'COURSE',
      subjectId: 'course-1',
      title: 'Course created',
      description: 'A learning course was created.',
      occurredAt: '2026-05-25T10:00:00.000Z',
    });
  });

  it('maps assessment events into assessment category without leaking unreleased score data', () => {
    const normalized = service.normalize({
      id: 'row-2',
      eventId: 'event-2',
      eventName: 'assessment.result.released',
      workspaceId: 'workspace-1',
      occurredAt: new Date('2026-05-25T11:00:00.000Z'),
      payload: {
        attemptId: 'attempt-1',
        score: 88,
        graderNotes: 'private',
      },
    });

    expect(normalized).toMatchObject({
      id: 'event-2',
      category: 'ASSESSMENT',
      subjectType: 'ASSESSMENT_RESULT',
      subjectId: 'attempt-1',
      type: 'assessment.result.released',
    });
    expect(JSON.stringify(normalized)).not.toContain('88');
    expect(JSON.stringify(normalized)).not.toContain('graderNotes');
  });

  it('maps content, media, communication, and campaign-safe event shapes when supported', () => {
    expect(
      service.normalize({
        id: 'row-3',
        eventId: 'event-3',
        eventName: 'content.document.published',
        workspaceId: 'workspace-1',
        occurredAt: new Date('2026-05-25T12:00:00.000Z'),
        payload: { documentId: 'document-1', privateUrl: 'https://private' },
      }),
    ).toMatchObject({
      category: 'CONTENT',
      subjectType: 'CONTENT_DOCUMENT',
      subjectId: 'document-1',
    });

    expect(
      service.normalize({
        id: 'row-4',
        eventId: 'event-4',
        eventName: 'media.upload.completed',
        workspaceId: 'workspace-1',
        occurredAt: new Date('2026-05-25T13:00:00.000Z'),
        payload: { assetId: 'asset-1', objectKey: 'unsafe-object-key' },
      }),
    ).toMatchObject({
      category: 'MEDIA',
      subjectType: 'MEDIA_ASSET',
      subjectId: 'asset-1',
    });

    expect(
      service.normalize({
        id: 'row-5',
        eventId: 'event-5',
        eventName: 'communication.intent.failed',
        workspaceId: 'workspace-1',
        occurredAt: new Date('2026-05-25T14:00:00.000Z'),
        payload: { intentId: 'intent-1', providerConfig: { secret: 'nope' } },
      }),
    ).toMatchObject({
      category: 'COMMUNICATION',
      subjectType: 'NOTIFICATION_INTENT',
      subjectId: 'intent-1',
    });
  });

  it('skips unsupported events, malformed payloads, and unscoped records safely', () => {
    expect(
      service.normalize({
        id: 'row-6',
        eventId: 'event-6',
        eventName: 'campaign.created',
        workspaceId: 'workspace-1',
        occurredAt: new Date('2026-05-25T15:00:00.000Z'),
        payload: { campaignId: 'campaign-1' },
      }),
    ).toBeNull();

    expect(
      service.normalize({
        id: 'row-7',
        eventId: 'event-7',
        eventName: 'learning.course.created',
        workspaceId: 'workspace-1',
        occurredAt: new Date('2026-05-25T15:00:00.000Z'),
        payload: 'invalid',
      }),
    ).toBeNull();

    expect(
      service.normalize({
        id: 'row-8',
        eventId: 'event-8',
        eventName: 'learning.course.created',
        workspaceId: null,
        occurredAt: new Date('2026-05-25T15:00:00.000Z'),
        payload: { courseId: 'course-1' },
      }),
    ).toBeNull();
  });

  it('is idempotent for the same event input', () => {
    const record = {
      id: 'row-9',
      eventId: 'event-9',
      eventName: 'communication.intent.created',
      workspaceId: 'workspace-1',
      occurredAt: new Date('2026-05-25T16:00:00.000Z'),
      payload: { intentId: 'intent-9', body: 'raw body' },
    };

    expect(service.normalize(record)).toEqual(service.normalize(record));
  });
});
