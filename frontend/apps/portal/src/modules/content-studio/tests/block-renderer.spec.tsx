import { describe, expect, it, vi } from 'vitest';
import { BlockRenderer } from '../components/blocks';
import { getByText, render, clickElement } from '@/testing';

vi.mock('@/modules/media-library', () => {
  return {
    useMediaAssets: () => ({
      assets: [
        {
          id: 'asset-video-1',
          filename: 'test.mp4',
          fileCategory: 'VIDEO',
          status: 'AVAILABLE',
        },
      ],
      loading: false,
    }),
    useMediaReadUrl: () => ({
      readUrl: { url: 'https://example.com/mock.mp4' },
      loading: false,
      loadReadUrl: vi.fn(),
      clearReadUrl: vi.fn(),
    }),
    AssetPickerDialog: ({ open, onSelect }: { open: boolean; onSelect: (selected: { id: string }[]) => void }) => {
      if (!open) return null;
      return (
        <div data-testid="mock-asset-picker-dialog">
          <button
            type="button"
            data-testid="mock-asset-picker-confirm"
            onClick={() => onSelect([{ id: 'asset-video-1' }])}
          >
            Confirm
          </button>
        </div>
      );
    },
  };
});

describe('BlockRenderer', () => {
  it('renders a paragraph block', async () => {
    const rendered = await render(
      <BlockRenderer
        block={{
          id: 'block-1',
          kind: 'PARAGRAPH',
          position: 0,
          path: '0',
          content: { text: 'Paragraph body' },
        }}
      />,
    );

    expect(getByText(rendered.container, 'Paragraph body')).toBeTruthy();
  });

  it('renders a heading block', async () => {
    const rendered = await render(
      <BlockRenderer
        block={{
          id: 'block-1',
          kind: 'HEADING',
          position: 0,
          path: '0',
          content: { text: 'Heading body' },
        }}
      />,
    );

    expect(getByText(rendered.container, 'Heading body')).toBeTruthy();
  });

  it('renders a code block', async () => {
    const rendered = await render(
      <BlockRenderer
        block={{
          id: 'block-1',
          kind: 'CODE',
          position: 0,
          path: '0',
          content: { code: 'const x = 1;', language: 'ts' },
        }}
      />,
    );

    expect(getByText(rendered.container, 'const x = 1;')).toBeTruthy();
  });

  it('renders an IMAGE block with picker and image preview', async () => {
    const onChange = vi.fn();
    const rendered = await render(
      <BlockRenderer
        block={{
          id: 'block-image-1',
          kind: 'IMAGE',
          position: 0,
          path: '0',
          content: { mediaAssetId: 'asset-image-1' },
        }}
        editable
        onChange={onChange}
      />,
    );

    expect(rendered.container.querySelector('[data-testid="media-block-image"]')).toBeTruthy();

    const button = getByText(rendered.container, 'Change media');
    expect(button).toBeTruthy();
  });

  it('renders a VIDEO block with video element', async () => {
    const rendered = await render(
      <BlockRenderer
        block={{
          id: 'block-video-1',
          kind: 'VIDEO',
          position: 0,
          path: '0',
          content: { mediaAssetId: 'asset-video-1' },
        }}
      />,
    );

    expect(rendered.container.querySelector('[data-testid="media-block-video"]')).toBeTruthy();
  });

  it('renders a reserved assessment placeholder', async () => {
    const rendered = await render(
      <BlockRenderer
        block={{
          id: 'block-1',
          kind: 'MCQ_QUESTION',
          position: 0,
          path: '0',
          content: {},
        }}
        editable
        onChange={vi.fn()}
      />,
    );

    expect(getByText(rendered.container, 'MCQ_QUESTION is reserved for future assessment builder behavior.')).toBeTruthy();
  });

  it('triggers media asset selection via AssetPickerDialog', async () => {
    const onChange = vi.fn();
    const rendered = await render(
      <BlockRenderer
        block={{
          id: 'block-image-1',
          kind: 'IMAGE',
          position: 0,
          path: '0',
          content: {},
        }}
        editable
        onChange={onChange}
      />,
    );

    // Initial state: shows "Select from Media Library" button
    const selectButton = getByText(rendered.container, 'Select from Media Library');
    expect(selectButton).toBeTruthy();

    // Click to open picker
    await clickElement(selectButton);

    // The mock AssetPickerDialog should render its confirm button
    const confirmButton = rendered.container.querySelector('[data-testid="mock-asset-picker-confirm"]');
    expect(confirmButton).toBeTruthy();

    // Click confirm
    await clickElement(confirmButton as HTMLElement);

    // Verify onChange was called with selected mediaAssetId
    expect(onChange).toHaveBeenCalledWith('block-image-1', { mediaAssetId: 'asset-video-1' });
  });
});
