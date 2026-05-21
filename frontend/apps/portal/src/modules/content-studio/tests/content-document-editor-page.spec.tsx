import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ContentDocumentEditorPage } from '../routes';
import { clickElement, getByText, render, waitFor } from '@/testing';

const mockUseContentDocument = vi.fn();

vi.mock('../hooks', () => ({
  useContentDocument: () => mockUseContentDocument(),
}));

vi.mock('../api', () => ({
  contentApiClient: {},
}));

describe('ContentDocumentEditorPage', () => {
  beforeEach(() => {
    mockUseContentDocument.mockReset();
  });

  it('renders the loading state', async () => {
    mockUseContentDocument.mockReturnValue({
      document: null,
      localBlocks: [],
      loading: true,
      error: null,
      refresh: vi.fn(),
    });

    const rendered = await render(<ContentDocumentEditorPage documentId="doc-1" />);
    expect(getByText(rendered.container, 'Loading content document...')).toBeTruthy();
  });

  it('renders the empty block state', async () => {
    mockUseContentDocument.mockReturnValue({
      document: {
        id: 'doc-1',
        title: 'Editor Doc',
        purpose: 'GENERAL_PAGE',
        status: 'DRAFT',
        ownerPrincipalId: 'principal-1',
        createdAt: '2026-05-13T00:00:00.000Z',
        updatedAt: '2026-05-13T00:00:00.000Z',
      },
      localBlocks: [],
      loading: false,
      error: null,
      isArchiving: false,
      isPublishing: false,
      isRenaming: false,
      isRestoring: false,
      isSaving: false,
      refresh: vi.fn(),
      renameDocument: vi.fn(),
      saveBlocks: vi.fn(),
      appendBlock: vi.fn(),
      updateBlockContent: vi.fn(),
      removeBlock: vi.fn(),
      publishDocument: vi.fn(),
      archiveDocument: vi.fn(),
      restoreDocument: vi.fn(),
    });

    const rendered = await render(<ContentDocumentEditorPage documentId="doc-1" />);
    expect(getByText(rendered.container, 'No blocks yet')).toBeTruthy();
    expect(rendered.container.querySelector('[data-testid="content-editor-shell"]')).toBeTruthy();
    expect(
      rendered.container.querySelector('[data-testid="content-block-empty-state"]'),
    ).toBeTruthy();
  });

  it('can append a paragraph block locally', async () => {
    const appendBlock = vi.fn();
    mockUseContentDocument.mockReturnValue({
      document: {
        id: 'doc-1',
        title: 'Editor Doc',
        purpose: 'GENERAL_PAGE',
        status: 'DRAFT',
        ownerPrincipalId: 'principal-1',
        createdAt: '2026-05-13T00:00:00.000Z',
        updatedAt: '2026-05-13T00:00:00.000Z',
      },
      localBlocks: [],
      loading: false,
      error: null,
      isArchiving: false,
      isPublishing: false,
      isRenaming: false,
      isRestoring: false,
      isSaving: false,
      refresh: vi.fn(),
      renameDocument: vi.fn(),
      saveBlocks: vi.fn(),
      appendBlock,
      updateBlockContent: vi.fn(),
      removeBlock: vi.fn(),
      publishDocument: vi.fn(),
      archiveDocument: vi.fn(),
      restoreDocument: vi.fn(),
    });

    const rendered = await render(<ContentDocumentEditorPage documentId="doc-1" />);
    await clickElement(getByText(rendered.container, 'Paragraph'));

    await waitFor(() => {
      expect(appendBlock).toHaveBeenCalledWith('PARAGRAPH');
    });
  });

  it('renders error state when the document load fails', async () => {
    mockUseContentDocument.mockReturnValue({
      document: null,
      localBlocks: [],
      loading: false,
      error: 'Content document loading failed.',
      refresh: vi.fn(),
    });

    const rendered = await render(<ContentDocumentEditorPage documentId="doc-1" />);
    expect(rendered.container.querySelector('[data-testid="content-error-state"]')).toBeTruthy();
  });
});
