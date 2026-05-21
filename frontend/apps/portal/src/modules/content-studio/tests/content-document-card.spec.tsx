import { describe, expect, it } from 'vitest';
import { ContentDocumentCard } from '../components/documents';
import { getByText, render } from '@/testing';

describe('ContentDocumentCard', () => {
  it('renders title, status, and purpose', async () => {
    const rendered = await render(
      <ContentDocumentCard
        document={{
          id: 'doc-1',
          title: 'Content Foundations',
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
        }}
      />,
    );

    expect(getByText(rendered.container, 'Content Foundations')).toBeTruthy();
    expect(getByText(rendered.container, 'DRAFT')).toBeTruthy();
    expect(getByText(rendered.container, 'General page')).toBeTruthy();
  });
});
