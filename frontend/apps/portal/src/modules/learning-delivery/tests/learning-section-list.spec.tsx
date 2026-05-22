import { describe, expect, it, vi } from 'vitest';
import { LearningSectionList } from '../components/shared/learning-section-list';
import { getByText, render } from '@/testing';

vi.mock('@/modules/media-library', () => {
  return {
    useMediaReadUrl: () => ({
      readUrl: { url: 'https://example.com/mock-file.mp4' },
      loading: false,
      loadReadUrl: vi.fn(),
      clearReadUrl: vi.fn(),
    }),
  };
});

describe('LearningSectionList Media Integration', () => {
  it('renders raw contentRef when mediaAsset is missing', async () => {
    const sections = [
      {
        id: 'sec-1',
        title: 'Section 1',
        position: 0,
        lessons: [
          {
            id: 'lesson-1',
            title: 'Lesson 1',
            kind: 'VIDEO' as const,
            position: 0,
            isRequired: false,
            contentRef: 'some-uuid-ref',
          },
        ],
      },
    ];

    const rendered = await render(<LearningSectionList sections={sections} />);
    expect(getByText(rendered.container, 'Ref: some-uuid-ref')).toBeTruthy();
  });

  it('renders media preview when mediaAsset is AVAILABLE', async () => {
    const sections = [
      {
        id: 'sec-1',
        title: 'Section 1',
        position: 0,
        lessons: [
          {
            id: 'lesson-2',
            title: 'Video Lesson',
            kind: 'VIDEO' as const,
            position: 0,
            isRequired: true,
            contentRef: 'some-uuid-ref',
            mediaAsset: {
              id: 'asset-video-1',
              filename: 'intro.mp4',
              contentType: 'video/mp4',
              fileCategory: 'VIDEO' as const,
              storageProvider: 'FIXTURE' as const,
              visibility: 'WORKSPACE' as const,
              status: 'AVAILABLE' as const,
              scanStatus: 'CLEAN' as const,
              ownerPrincipalId: 'principal-1',
              createdAt: '2026-05-13T00:00:00.000Z',
              updatedAt: '2026-05-13T00:00:00.000Z',
              metadata: {},
            },
          },
        ],
      },
    ];

    const rendered = await render(<LearningSectionList sections={sections} />);
    expect(rendered.container.querySelector('[data-testid="lesson-media-video"]')).toBeTruthy();
  });

  it('renders unavailable warning when mediaAsset is not AVAILABLE', async () => {
    const sections = [
      {
        id: 'sec-1',
        title: 'Section 1',
        position: 0,
        lessons: [
          {
            id: 'lesson-3',
            title: 'Pending Lesson',
            kind: 'VIDEO' as const,
            position: 0,
            isRequired: false,
            contentRef: 'some-uuid-ref',
            mediaAsset: {
              id: 'asset-video-2',
              filename: 'pending.mp4',
              contentType: 'video/mp4',
              fileCategory: 'VIDEO' as const,
              storageProvider: 'FIXTURE' as const,
              visibility: 'WORKSPACE' as const,
              status: 'PENDING_UPLOAD' as const,
              scanStatus: 'CLEAN' as const,
              ownerPrincipalId: 'principal-1',
              createdAt: '2026-05-13T00:00:00.000Z',
              updatedAt: '2026-05-13T00:00:00.000Z',
              metadata: {},
            },
          },
        ],
      },
    ];

    const rendered = await render(<LearningSectionList sections={sections} />);
    expect(
      getByText(
        rendered.container,
        'Media content is currently unavailable (Status: PENDING_UPLOAD).',
      ),
    ).toBeTruthy();
  });
});
