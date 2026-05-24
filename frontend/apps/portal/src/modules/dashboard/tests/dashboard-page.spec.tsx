import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getByText, render, waitFor } from '@/testing';
import { DashboardPage } from '../routes/dashboard-page';

const { getDashboardSummary, getMultiWorkspaceDashboard } = vi.hoisted(() => ({
  getDashboardSummary: vi.fn(),
  getMultiWorkspaceDashboard: vi.fn(),
}));

vi.mock('../api/dashboard-api-client', () => ({
  dashboardApiClient: {
    getDashboardSummary,
    getMultiWorkspaceDashboard,
  },
}));

describe('DashboardPage', () => {
  beforeEach(() => {
    getDashboardSummary.mockReset();
    getMultiWorkspaceDashboard.mockReset();
  });

  it('renders loading and success states', async () => {
    getDashboardSummary.mockResolvedValue({
      summary: {
        workspaceId: 'workspace-1',
        totalCourses: 4,
        totalPublishedCourses: 2,
        totalAssessments: 3,
        totalActiveAssessments: 2,
        pendingGradingCount: 1,
        contentDocumentsCount: 6,
        mediaAssetsCount: 7,
        failedQuarantinedMediaCount: 0,
        campaignsCount: 2,
      },
      recentActivity: [],
    });
    getMultiWorkspaceDashboard.mockResolvedValue({ workspaces: [] });

    const rendered = await render(<DashboardPage />);

    await waitFor(() => {
      expect(getByText(rendered.container, 'Courses')).toBeTruthy();
      expect(getByText(rendered.container, '4')).toBeTruthy();
    });
  });

  it('renders an error state', async () => {
    getDashboardSummary.mockRejectedValue(new Error('Service unavailable'));
    getMultiWorkspaceDashboard.mockRejectedValue(new Error('Service unavailable'));

    const rendered = await render(<DashboardPage />);
    await waitFor(() => {
      expect(getByText(rendered.container, 'Service unavailable')).toBeTruthy();
    });
  });
});
