import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ContentDocumentsPage } from '../routes';
import { getByText, render } from '@/testing';

const mockUseContentDocuments = vi.fn();

vi.mock('../hooks', () => ({
  useContentDocuments: () => mockUseContentDocuments(),
}));

vi.mock('../api', () => ({
  contentApiClient: {},
}));

describe('ContentDocumentsPage', () => {
  beforeEach(() => {
    mockUseContentDocuments.mockReset();
  });

  it('renders the empty state', async () => {
    mockUseContentDocuments.mockReturnValue({
      documents: [],
      loading: false,
      error: null,
      refresh: vi.fn(),
      createDocument: vi.fn(),
    });

    const rendered = await render(<ContentDocumentsPage />);
    expect(getByText(rendered.container, 'No content documents yet')).toBeTruthy();
    expect(rendered.container.querySelector('[data-testid="content-documents-page"]')).toBeTruthy();
    expect(rendered.container.querySelector('[data-testid="content-empty-state"]')).toBeTruthy();
  });

  it('renders document cards', async () => {
    mockUseContentDocuments.mockReturnValue({
      documents: [
        {
          id: 'doc-1',
          title: 'Creator Doc',
          purpose: 'GENERAL_PAGE',
          status: 'DRAFT',
          ownerPrincipalId: 'principal-1',
          createdAt: '2026-05-13T00:00:00.000Z',
          updatedAt: '2026-05-13T00:00:00.000Z',
          currentDraftVersion: {
            id: 'version-1',
            versionNumber: 1,
            status: 'DRAFT',
            createdByPrincipalId: 'principal-1',
            createdAt: '2026-05-13T00:00:00.000Z',
            blocks: [],
          },
        },
      ],
      loading: false,
      error: null,
      refresh: vi.fn(),
      createDocument: vi.fn(),
    });

    const rendered = await render(<ContentDocumentsPage />);
    expect(getByText(rendered.container, 'Creator Doc')).toBeTruthy();
  });
});
