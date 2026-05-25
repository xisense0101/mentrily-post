import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getCreatorLearningMetrics,
  getCreatorAssessmentMetrics,
  getCreatorContentMetrics,
  getCreatorMediaMetrics,
  getCreatorCommunicationMetrics,
  getCreatorCampaignMetrics,
} = vi.hoisted(() => ({
  getCreatorLearningMetrics: vi.fn(),
  getCreatorAssessmentMetrics: vi.fn(),
  getCreatorContentMetrics: vi.fn(),
  getCreatorMediaMetrics: vi.fn(),
  getCreatorCommunicationMetrics: vi.fn(),
  getCreatorCampaignMetrics: vi.fn(),
}));

vi.mock('../../dashboard/api/dashboard-api-client', () => ({
  createDashboardApiClient: () => ({
    getCreatorLearningMetrics,
    getCreatorAssessmentMetrics,
    getCreatorContentMetrics,
    getCreatorMediaMetrics,
    getCreatorCommunicationMetrics,
    getCreatorCampaignMetrics,
  }),
}));

describe('analyticsApiClient', () => {
  beforeEach(() => {
    vi.resetModules();
    getCreatorLearningMetrics.mockReset();
    getCreatorAssessmentMetrics.mockReset();
    getCreatorContentMetrics.mockReset();
    getCreatorMediaMetrics.mockReset();
    getCreatorCommunicationMetrics.mockReset();
    getCreatorCampaignMetrics.mockReset();
  });

  it('delegates getCreatorLearningMetrics to the dashboard client', async () => {
    const metrics = {
      totalCourses: 4,
      publishedCourses: 2,
      activeEnrollments: 8,
      lessonCompletions: 20,
      courseCompletions: 3,
      linkedAssessmentsCount: 5,
      metrics: [],
    };
    getCreatorLearningMetrics.mockResolvedValue(metrics);

    const { analyticsApiClient } = await import('../api/analytics-api-client');
    const result = await analyticsApiClient.getCreatorLearningMetrics();

    expect(result).toEqual(metrics);
    expect(getCreatorLearningMetrics).toHaveBeenCalledOnce();
  });

  it('delegates getCreatorAssessmentMetrics to the dashboard client', async () => {
    const metrics = {
      totalAssessments: 3,
      publishedAssessments: 2,
      attemptsStarted: 10,
      submissions: 9,
      pendingGrading: 1,
      resultsReleased: 5,
      metrics: [],
    };
    getCreatorAssessmentMetrics.mockResolvedValue(metrics);

    const { analyticsApiClient } = await import('../api/analytics-api-client');
    const result = await analyticsApiClient.getCreatorAssessmentMetrics();

    expect(result).toEqual(metrics);
    expect(getCreatorAssessmentMetrics).toHaveBeenCalledOnce();
  });

  it('delegates getCreatorContentMetrics to the dashboard client', async () => {
    const metrics = {
      totalDocuments: 6,
      publishedDocuments: 4,
      recentlyUpdatedDocuments: 2,
      metrics: [],
    };
    getCreatorContentMetrics.mockResolvedValue(metrics);

    const { analyticsApiClient } = await import('../api/analytics-api-client');
    const result = await analyticsApiClient.getCreatorContentMetrics();

    expect(result).toEqual(metrics);
  });

  it('delegates getCreatorMediaMetrics to the dashboard client', async () => {
    const metrics = { totalAssets: 7, processingFailed: 0, quarantinedAssets: 0, metrics: [] };
    getCreatorMediaMetrics.mockResolvedValue(metrics);

    const { analyticsApiClient } = await import('../api/analytics-api-client');
    const result = await analyticsApiClient.getCreatorMediaMetrics();

    expect(result).toEqual(metrics);
    // Confirm no private/unsafe fields are surfaced
    expect(JSON.stringify(result)).not.toContain('storageKey');
    expect(JSON.stringify(result)).not.toContain('objectKey');
    expect(JSON.stringify(result)).not.toContain('privateUrl');
  });

  it('delegates getCreatorCommunicationMetrics to the dashboard client', async () => {
    const metrics = {
      notificationIntentsCreated: 10,
      delivered: 7,
      failed: 1,
      pendingDelivery: 2,
      metrics: [],
    };
    getCreatorCommunicationMetrics.mockResolvedValue(metrics);

    const { analyticsApiClient } = await import('../api/analytics-api-client');
    const result = await analyticsApiClient.getCreatorCommunicationMetrics();

    expect(result).toEqual(metrics);
    // Confirm no provider secrets surfaced
    expect(JSON.stringify(result)).not.toContain('providerConfig');
    expect(JSON.stringify(result)).not.toContain('RESEND_API_KEY');
  });

  it('delegates getCreatorCampaignMetrics to the dashboard client', async () => {
    const metrics = {
      totalCampaigns: 3,
      draftCampaigns: 1,
      scheduledCampaigns: 1,
      archivedCampaigns: 1,
      metrics: [],
    };
    getCreatorCampaignMetrics.mockResolvedValue(metrics);

    const { analyticsApiClient } = await import('../api/analytics-api-client');
    const result = await analyticsApiClient.getCreatorCampaignMetrics();

    expect(result).toEqual(metrics);
  });
});
