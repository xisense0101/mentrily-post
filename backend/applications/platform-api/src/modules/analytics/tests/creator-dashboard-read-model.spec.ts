import { describe, expect, it, vi } from 'vitest';
import { AnalyticsDashboardReadModelService } from '../application/analytics-dashboard-read-model.service.js';
import { AnalyticsEventNormalizerService } from '../application/analytics-event-normalizer.service.js';

describe('AnalyticsDashboardReadModelService', () => {
  function createPrismaMock() {
    return {
      learningCourse: { count: vi.fn() },
      learningEnrollment: { count: vi.fn() },
      learningProgress: { count: vi.fn() },
      learningAssessmentLink: { count: vi.fn() },
      assessment: { count: vi.fn() },
      assessmentAttempt: { count: vi.fn() },
      assessmentAttemptResult: { count: vi.fn() },
      contentDocument: { count: vi.fn() },
      mediaAsset: { count: vi.fn() },
      notificationIntent: { count: vi.fn() },
      campaign: { count: vi.fn() },
      outboxMessage: { findMany: vi.fn() },
    };
  }

  it('builds workspace-scoped creator summary metrics from source tables', async () => {
    const prisma = createPrismaMock();
    prisma.learningCourse.count.mockResolvedValueOnce(4).mockResolvedValueOnce(2);
    prisma.learningEnrollment.count.mockResolvedValueOnce(8).mockResolvedValueOnce(3);
    prisma.learningProgress.count.mockResolvedValueOnce(20);
    prisma.learningAssessmentLink.count.mockResolvedValueOnce(5);
    prisma.assessment.count.mockResolvedValueOnce(6).mockResolvedValueOnce(4);
    prisma.assessmentAttempt.count.mockResolvedValueOnce(12).mockResolvedValueOnce(11);
    prisma.assessmentAttemptResult.count.mockResolvedValueOnce(2).mockResolvedValueOnce(7);
    prisma.contentDocument.count
      .mockResolvedValueOnce(9)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(3);
    prisma.mediaAsset.count
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2);
    prisma.notificationIntent.count
      .mockResolvedValueOnce(14)
      .mockResolvedValueOnce(9)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(3);
    prisma.campaign.count
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1);

    const service = new AnalyticsDashboardReadModelService(
      prisma as never,
      new AnalyticsEventNormalizerService(),
    );

    const summary = await service.getCreatorDashboardSummary('workspace-1');

    expect(summary).toMatchObject({
      workspaceId: 'workspace-1',
      totalCourses: 4,
      totalPublishedCourses: 2,
      totalAssessments: 6,
      totalActiveAssessments: 4,
      pendingGradingCount: 2,
      contentDocumentsCount: 9,
      mediaAssetsCount: 10,
      failedQuarantinedMediaCount: 3,
      campaignsCount: 4,
      learning: {
        totalCourses: 4,
        linkedAssessmentsCount: 5,
      },
      assessment: {
        submissions: 11,
        resultsReleased: 7,
      },
      communication: {
        failed: 2,
        pendingDelivery: 3,
      },
    });
  });

  it('deduplicates repeated outbox events by event id for retry-safe activity projection', async () => {
    const prisma = createPrismaMock();
    prisma.outboxMessage.findMany.mockResolvedValue([
      {
        id: 'row-1',
        eventId: 'event-1',
        eventName: 'learning.course.created',
        workspaceId: 'workspace-1',
        occurredAt: new Date('2026-05-25T10:00:00.000Z'),
        createdAt: new Date('2026-05-25T10:00:00.000Z'),
        payload: { courseId: 'course-1', storageKey: 'hidden' },
      },
      {
        id: 'row-2',
        eventId: 'event-1',
        eventName: 'learning.course.created',
        workspaceId: 'workspace-1',
        occurredAt: new Date('2026-05-25T10:00:00.000Z'),
        createdAt: new Date('2026-05-25T10:00:01.000Z'),
        payload: { courseId: 'course-1', storageKey: 'hidden' },
      },
      {
        id: 'row-3',
        eventId: 'event-2',
        eventName: 'assessment.result.released',
        workspaceId: 'workspace-1',
        occurredAt: new Date('2026-05-25T11:00:00.000Z'),
        createdAt: new Date('2026-05-25T11:00:00.000Z'),
        payload: { attemptId: 'attempt-1', graderNotes: 'hidden' },
      },
      {
        id: 'row-4',
        eventId: 'event-3',
        eventName: 'unknown.event',
        workspaceId: 'workspace-1',
        occurredAt: new Date('2026-05-25T12:00:00.000Z'),
        createdAt: new Date('2026-05-25T12:00:00.000Z'),
        payload: { anything: true },
      },
    ]);

    const service = new AnalyticsDashboardReadModelService(
      prisma as never,
      new AnalyticsEventNormalizerService(),
    );

    const activity = await service.getRecentActivity('workspace-1', 10);

    expect(activity).toHaveLength(2);
    expect(activity.map((item) => item.id)).toEqual(['event-1', 'event-2']);
    expect(JSON.stringify(activity)).not.toContain('storageKey');
    expect(JSON.stringify(activity)).not.toContain('graderNotes');
  });
});
