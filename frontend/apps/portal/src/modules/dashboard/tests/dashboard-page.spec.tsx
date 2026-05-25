import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getByText, render, waitFor } from '@/testing';
import { DashboardPage } from '../routes/dashboard-page';

const { getCreatorDashboardSummary, getCreatorDashboardActivity, getMultiWorkspaceDashboard } =
  vi.hoisted(() => ({
    getCreatorDashboardSummary: vi.fn(),
    getCreatorDashboardActivity: vi.fn(),
    getMultiWorkspaceDashboard: vi.fn(),
  }));

vi.mock('../api/dashboard-api-client', () => ({
  dashboardApiClient: {
    getCreatorDashboardSummary,
    getCreatorDashboardActivity,
    getMultiWorkspaceDashboard,
  },
}));

describe('DashboardPage', () => {
  beforeEach(() => {
    getCreatorDashboardSummary.mockReset();
    getCreatorDashboardActivity.mockReset();
    getMultiWorkspaceDashboard.mockReset();
  });

  it('renders loading and success states', async () => {
    getCreatorDashboardSummary.mockResolvedValue({
      workspaceId: 'workspace-1',
      generatedAt: '2026-05-25T00:00:00.000Z',
      learning: {
        totalCourses: 4,
        publishedCourses: 2,
        activeEnrollments: 8,
        lessonCompletions: 20,
        courseCompletions: 3,
        linkedAssessmentsCount: 5,
        metrics: [],
      },
      assessment: {
        totalAssessments: 3,
        publishedAssessments: 2,
        attemptsStarted: 12,
        submissions: 11,
        pendingGrading: 1,
        resultsReleased: 6,
        metrics: [],
      },
      content: {
        totalDocuments: 6,
        publishedDocuments: 4,
        recentlyUpdatedDocuments: 2,
        metrics: [],
      },
      media: {
        totalAssets: 7,
        processingFailed: 0,
        quarantinedAssets: 0,
        metrics: [],
      },
      communication: {
        notificationIntentsCreated: 10,
        delivered: 7,
        failed: 1,
        pendingDelivery: 2,
        metrics: [],
      },
      campaign: {
        totalCampaigns: 2,
        draftCampaigns: 1,
        scheduledCampaigns: 1,
        archivedCampaigns: 0,
        metrics: [],
      },
    });
    getCreatorDashboardActivity.mockResolvedValue([]);
    getMultiWorkspaceDashboard.mockResolvedValue({ workspaces: [] });

    const rendered = await render(<DashboardPage />);

    await waitFor(() => {
      expect(getByText(rendered.container, 'Learning')).toBeTruthy();
      expect(getByText(rendered.container, 'Active Enrollments')).toBeTruthy();
      expect(getByText(rendered.container, 'Communication')).toBeTruthy();
      expect(
        rendered.container.querySelector('[data-testid="dashboard-empty-activity"]'),
      ).toBeTruthy();
    });
  });

  it('renders an empty recent activity state', async () => {
    getCreatorDashboardSummary.mockResolvedValue({
      workspaceId: 'workspace-1',
      generatedAt: '2026-05-25T00:00:00.000Z',
      learning: {
        totalCourses: 0,
        publishedCourses: 0,
        activeEnrollments: 0,
        lessonCompletions: 0,
        courseCompletions: 0,
        linkedAssessmentsCount: 0,
        metrics: [],
      },
      assessment: {
        totalAssessments: 0,
        publishedAssessments: 0,
        attemptsStarted: 0,
        submissions: 0,
        pendingGrading: 0,
        resultsReleased: 0,
        metrics: [],
      },
      content: {
        totalDocuments: 0,
        publishedDocuments: 0,
        recentlyUpdatedDocuments: 0,
        metrics: [],
      },
      media: {
        totalAssets: 0,
        processingFailed: 0,
        quarantinedAssets: 0,
        metrics: [],
      },
      communication: {
        notificationIntentsCreated: 0,
        delivered: 0,
        failed: 0,
        pendingDelivery: 0,
        metrics: [],
      },
      campaign: {
        totalCampaigns: 0,
        draftCampaigns: 0,
        scheduledCampaigns: 0,
        archivedCampaigns: 0,
        metrics: [],
      },
    });
    getCreatorDashboardActivity.mockResolvedValue([]);
    getMultiWorkspaceDashboard.mockResolvedValue({ workspaces: [] });

    const rendered = await render(<DashboardPage />);

    await waitFor(() => {
      expect(getByText(rendered.container, 'No recent workspace activity yet.')).toBeTruthy();
    });
  });

  it('renders safe recent activity details without exposing private payload fields', async () => {
    getCreatorDashboardSummary.mockResolvedValue({
      workspaceId: 'workspace-1',
      generatedAt: '2026-05-25T00:00:00.000Z',
      learning: {
        totalCourses: 1,
        publishedCourses: 1,
        activeEnrollments: 1,
        lessonCompletions: 1,
        courseCompletions: 1,
        linkedAssessmentsCount: 1,
        metrics: [],
      },
      assessment: {
        totalAssessments: 1,
        publishedAssessments: 1,
        attemptsStarted: 1,
        submissions: 1,
        pendingGrading: 0,
        resultsReleased: 1,
        metrics: [],
      },
      content: {
        totalDocuments: 1,
        publishedDocuments: 1,
        recentlyUpdatedDocuments: 1,
        metrics: [],
      },
      media: {
        totalAssets: 1,
        processingFailed: 0,
        quarantinedAssets: 0,
        metrics: [],
      },
      communication: {
        notificationIntentsCreated: 1,
        delivered: 1,
        failed: 0,
        pendingDelivery: 0,
        metrics: [],
      },
      campaign: {
        totalCampaigns: 1,
        draftCampaigns: 0,
        scheduledCampaigns: 1,
        archivedCampaigns: 0,
        metrics: [],
      },
    });
    getCreatorDashboardActivity.mockResolvedValue([
      {
        id: 'activity-1',
        type: 'assessment.result.released',
        category: 'ASSESSMENT',
        subjectType: 'ASSESSMENT_RESULT',
        title: 'Assessment result released',
        description: 'A released assessment result is now visible to the learner.',
        occurredAt: '2026-05-25T00:00:00.000Z',
      },
    ]);
    getMultiWorkspaceDashboard.mockResolvedValue({ workspaces: [] });

    const rendered = await render(<DashboardPage />);

    await waitFor(() => {
      expect(getByText(rendered.container, 'Assessment result released')).toBeTruthy();
    });

    expect(rendered.container.textContent).not.toContain('providerConfig');
    expect(rendered.container.textContent).not.toContain('graderNotes');
    expect(rendered.container.textContent).not.toContain('unreleasedScore');
  });

  it('renders an error state', async () => {
    getCreatorDashboardSummary.mockRejectedValue(new Error('Service unavailable'));
    getCreatorDashboardActivity.mockRejectedValue(new Error('Service unavailable'));
    getMultiWorkspaceDashboard.mockRejectedValue(new Error('Service unavailable'));

    const rendered = await render(<DashboardPage />);
    await waitFor(() => {
      expect(getByText(rendered.container, 'Service unavailable')).toBeTruthy();
    });
  });

  it('renders a forbidden state', async () => {
    getCreatorDashboardSummary.mockRejectedValue(new Error('403 forbidden'));
    getCreatorDashboardActivity.mockRejectedValue(new Error('403 forbidden'));
    getMultiWorkspaceDashboard.mockRejectedValue(new Error('403 forbidden'));

    const rendered = await render(<DashboardPage />);

    await waitFor(() => {
      expect(getByText(rendered.container, 'Access denied')).toBeTruthy();
    });
  });
});
