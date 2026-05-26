import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '@mentrily/data-platform';
import type {
  AnalyticsDashboardActivityItemContract,
  AnalyticsDashboardMetricContract,
  CreatorDashboardAssessmentMetricsContract,
  CreatorDashboardCampaignMetricsContract,
  CreatorDashboardCommunicationMetricsContract,
  CreatorDashboardContentMetricsContract,
  CreatorDashboardLearningMetricsContract,
  CreatorDashboardMediaMetricsContract,
  CreatorDashboardSummaryContract,
} from '@mentrily/contract-catalog';
import { AnalyticsEventNormalizerService } from './analytics-event-normalizer.service.js';

@Injectable()
export class AnalyticsDashboardReadModelService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AnalyticsEventNormalizerService)
    private readonly normalizer: AnalyticsEventNormalizerService,
  ) {}

  async getCreatorDashboardSummary(workspaceId: string): Promise<CreatorDashboardSummaryContract> {
    const [learning, assessment, content, media, communication, campaign] = await Promise.all([
      this.getLearningMetrics(workspaceId),
      this.getAssessmentMetrics(workspaceId),
      this.getContentMetrics(workspaceId),
      this.getMediaMetrics(workspaceId),
      this.getCommunicationMetrics(workspaceId),
      this.getCampaignMetrics(workspaceId),
    ]);

    return {
      workspaceId,
      generatedAt: new Date().toISOString(),
      totalCourses: learning.totalCourses,
      totalPublishedCourses: learning.publishedCourses,
      totalAssessments: assessment.totalAssessments,
      totalActiveAssessments: assessment.publishedAssessments,
      pendingGradingCount: assessment.pendingGrading,
      contentDocumentsCount: content.totalDocuments,
      mediaAssetsCount: media.totalAssets,
      failedQuarantinedMediaCount: media.processingFailed + media.quarantinedAssets,
      campaignsCount: campaign.totalCampaigns - campaign.archivedCampaigns,
      learning,
      assessment,
      content,
      media,
      communication,
      campaign,
    };
  }

  async getRecentActivity(
    workspaceId: string,
    limit = 10,
  ): Promise<AnalyticsDashboardActivityItemContract[]> {
    const records = await this.prisma.outboxMessage.findMany({
      where: { workspaceId },
      orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
      take: Math.max(limit * 5, 25),
      select: {
        id: true,
        eventId: true,
        eventName: true,
        workspaceId: true,
        occurredAt: true,
        payload: true,
      },
    });

    const activity: AnalyticsDashboardActivityItemContract[] = [];
    const seenIds = new Set<string>();

    for (const record of records) {
      const item = this.normalizer.normalize(record);
      if (!item || seenIds.has(item.id)) {
        continue;
      }
      seenIds.add(item.id);
      activity.push(item);
      if (activity.length >= limit) {
        break;
      }
    }

    return activity;
  }

  async getLearningMetrics(workspaceId: string): Promise<CreatorDashboardLearningMetricsContract> {
    const [
      totalCourses,
      publishedCourses,
      activeEnrollments,
      lessonCompletions,
      courseCompletions,
      linkedAssessmentsCount,
    ] = await Promise.all([
      this.prisma.learningCourse.count({ where: { workspaceId } }),
      this.prisma.learningCourse.count({ where: { workspaceId, status: 'PUBLISHED' } }),
      this.prisma.learningEnrollment.count({ where: { workspaceId, status: 'ACTIVE' } }),
      this.prisma.learningProgress.count({ where: { workspaceId, status: 'COMPLETED' } }),
      this.prisma.learningEnrollment.count({ where: { workspaceId, status: 'COMPLETED' } }),
      this.prisma.learningAssessmentLink.count({ where: { workspaceId } }),
    ]);

    return {
      totalCourses,
      publishedCourses,
      activeEnrollments,
      lessonCompletions,
      courseCompletions,
      linkedAssessmentsCount,
      metrics: [
        metric('learning.total_courses', totalCourses, 'Total Courses'),
        metric('learning.published_courses', publishedCourses, 'Published Courses'),
        metric('learning.active_enrollments', activeEnrollments, 'Active Enrollments'),
        metric('learning.lesson_completions', lessonCompletions, 'Lesson Completions'),
        metric('learning.course_completions', courseCompletions, 'Course Completions'),
        metric('learning.linked_assessments', linkedAssessmentsCount, 'Linked Assessments'),
      ],
    };
  }

  async getAssessmentMetrics(
    workspaceId: string,
  ): Promise<CreatorDashboardAssessmentMetricsContract> {
    const [
      totalAssessments,
      publishedAssessments,
      attemptsStarted,
      submissions,
      pendingGrading,
      resultsReleased,
    ] = await Promise.all([
      this.prisma.assessment.count({ where: { workspaceId } }),
      this.prisma.assessment.count({ where: { workspaceId, status: 'PUBLISHED' } }),
      this.prisma.assessmentAttempt.count({ where: { workspaceId } }),
      this.prisma.assessmentAttempt.count({ where: { workspaceId, submittedAt: { not: null } } }),
      // GRADED = grading run complete but not yet released — NOT pending grading.
      // Truly pending = NOT_GRADED (auto-grade not run) | AUTO_GRADING_RESERVED | PENDING_MANUAL_REVIEW.
      this.prisma.assessmentAttemptResult.count({
        where: {
          attempt: { workspaceId },
          gradingStatus: { in: ['NOT_GRADED', 'AUTO_GRADING_RESERVED', 'PENDING_MANUAL_REVIEW'] },
        },
      }),
      this.prisma.assessmentAttemptResult.count({
        where: { attempt: { workspaceId }, releasedAt: { not: null } },
      }),
    ]);

    // passRateReleased: only computed when there are released results to avoid division by zero.
    const releasedWithScore =
      resultsReleased > 0
        ? await this.prisma.assessmentAttemptResult.count({
            where: {
              attempt: { workspaceId },
              releasedAt: { not: null },
              // RELEASED = result available to learner with final score.
              gradingStatus: 'RELEASED',
            },
          })
        : 0;

    const passRateReleased =
      resultsReleased > 0 && releasedWithScore > 0
        ? Math.round((releasedWithScore / resultsReleased) * 100)
        : undefined;

    return {
      totalAssessments,
      publishedAssessments,
      attemptsStarted,
      submissions,
      pendingGrading,
      resultsReleased,
      ...(passRateReleased !== undefined ? { passRateReleased } : {}),
      metrics: [
        metric('assessment.total_assessments', totalAssessments, 'Total Assessments'),
        metric('assessment.published_assessments', publishedAssessments, 'Published Assessments'),
        metric('assessment.attempts_started', attemptsStarted, 'Attempts Started'),
        metric('assessment.submissions', submissions, 'Submissions'),
        metric('assessment.pending_grading', pendingGrading, 'Pending Grading'),
        metric('assessment.results_released', resultsReleased, 'Results Released'),
      ],
    };
  }

  async getContentMetrics(workspaceId: string): Promise<CreatorDashboardContentMetricsContract> {
    const recentBoundary = new Date();
    recentBoundary.setDate(recentBoundary.getDate() - 7);

    const [totalDocuments, publishedDocuments, recentlyUpdatedDocuments] = await Promise.all([
      this.prisma.contentDocument.count({ where: { workspaceId } }),
      this.prisma.contentDocument.count({ where: { workspaceId, status: 'PUBLISHED' } }),
      this.prisma.contentDocument.count({
        where: { workspaceId, updatedAt: { gte: recentBoundary } },
      }),
    ]);

    return {
      totalDocuments,
      publishedDocuments,
      recentlyUpdatedDocuments,
      metrics: [
        metric('content.total_documents', totalDocuments, 'Total Documents'),
        metric('content.published_documents', publishedDocuments, 'Published Documents'),
        metric(
          'content.recently_updated_documents',
          recentlyUpdatedDocuments,
          'Recently Updated Documents',
        ),
      ],
    };
  }

  async getMediaMetrics(workspaceId: string): Promise<CreatorDashboardMediaMetricsContract> {
    const [totalAssets, processingFailed, quarantinedAssets] = await Promise.all([
      this.prisma.mediaAsset.count({ where: { workspaceId } }),
      this.prisma.mediaAsset.count({
        where: {
          workspaceId,
          status: { in: ['FAILED', 'PROCESSING_FAILED'] },
        },
      }),
      this.prisma.mediaAsset.count({
        where: {
          workspaceId,
          scanStatus: { in: ['INFECTED', 'QUARANTINED', 'SUSPICIOUS', 'SCAN_FAILED'] },
        },
      }),
    ]);

    return {
      totalAssets,
      processingFailed,
      quarantinedAssets,
      metrics: [
        metric('media.total_assets', totalAssets, 'Total Assets'),
        metric('media.processing_failed', processingFailed, 'Processing Failed'),
        metric('media.quarantined_assets', quarantinedAssets, 'Quarantined or Unsafe'),
      ],
    };
  }

  async getCommunicationMetrics(
    workspaceId: string,
  ): Promise<CreatorDashboardCommunicationMetricsContract> {
    const [notificationIntentsCreated, delivered, failed, pendingDelivery] = await Promise.all([
      this.prisma.notificationIntent.count({ where: { workspaceId } }),
      this.prisma.notificationIntent.count({ where: { workspaceId, status: 'DISPATCHED' } }),
      this.prisma.notificationIntent.count({ where: { workspaceId, status: 'FAILED' } }),
      this.prisma.notificationIntent.count({
        where: { workspaceId, status: { in: ['DRAFT', 'QUEUED'] } },
      }),
    ]);

    return {
      notificationIntentsCreated,
      delivered,
      failed,
      pendingDelivery,
      metrics: [
        metric(
          'communication.notification_intents_created',
          notificationIntentsCreated,
          'Notification Intents',
        ),
        metric('communication.delivered', delivered, 'Delivered'),
        metric('communication.failed', failed, 'Failed'),
        metric('communication.pending_delivery', pendingDelivery, 'Pending Delivery'),
      ],
    };
  }

  async getCampaignMetrics(workspaceId: string): Promise<CreatorDashboardCampaignMetricsContract> {
    const [totalCampaigns, draftCampaigns, scheduledCampaigns, archivedCampaigns] =
      await Promise.all([
        this.prisma.campaign.count({ where: { workspaceId } }),
        this.prisma.campaign.count({ where: { workspaceId, status: 'DRAFT' } }),
        this.prisma.campaign.count({ where: { workspaceId, status: 'SCHEDULED' } }),
        this.prisma.campaign.count({ where: { workspaceId, status: 'ARCHIVED' } }),
      ]);

    return {
      totalCampaigns,
      draftCampaigns,
      scheduledCampaigns,
      archivedCampaigns,
      metrics: [
        metric('campaign.total_campaigns', totalCampaigns, 'Total Campaigns'),
        metric('campaign.draft_campaigns', draftCampaigns, 'Draft Campaigns'),
        metric('campaign.scheduled_campaigns', scheduledCampaigns, 'Scheduled Campaigns'),
        metric('campaign.archived_campaigns', archivedCampaigns, 'Archived Campaigns'),
      ],
    };
  }
}

function metric(
  key: AnalyticsDashboardMetricContract['key'],
  value: number,
  label: string,
): AnalyticsDashboardMetricContract {
  return { key, value, label };
}
