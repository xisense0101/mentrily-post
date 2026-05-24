import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getByText, render, waitFor } from '@/testing';
import { CampaignsPage } from '../routes/campaigns-page';

const { listCampaigns, listTemplates } = vi.hoisted(() => ({
  listCampaigns: vi.fn(),
  listTemplates: vi.fn(),
}));

vi.mock('../api/campaign-api-client', () => ({
  campaignApiClient: {
    listCampaigns,
    listTemplates,
    previewAudience: vi.fn(),
    previewMessage: vi.fn(),
  },
}));

describe('CampaignsPage', () => {
  beforeEach(() => {
    listCampaigns.mockReset();
    listTemplates.mockReset();
  });

  it('renders the empty state', async () => {
    listCampaigns.mockResolvedValue([]);
    listTemplates.mockResolvedValue([]);

    const rendered = await render(<CampaignsPage />);
    await waitFor(() => {
      expect(getByText(rendered.container, 'No campaigns created yet.')).toBeTruthy();
    });
  });

  it('renders a campaign list', async () => {
    listCampaigns.mockResolvedValue([
      {
        id: 'campaign-1',
        tenantId: 'tenant-1',
        workspaceId: 'workspace-1',
        name: 'Launch',
        status: 'DRAFT',
        channel: 'EMAIL',
        body: 'Hello',
        audienceType: 'ALL_WORKSPACE_MEMBERS',
        audienceConfig: {},
        createdByPrincipalId: 'principal-1',
        createdAt: '2026-05-24T00:00:00.000Z',
        updatedAt: '2026-05-24T00:00:00.000Z',
      },
    ]);
    listTemplates.mockResolvedValue([]);

    const rendered = await render(<CampaignsPage />);
    await waitFor(() => {
      expect(getByText(rendered.container, 'Launch')).toBeTruthy();
    });
  });
});
