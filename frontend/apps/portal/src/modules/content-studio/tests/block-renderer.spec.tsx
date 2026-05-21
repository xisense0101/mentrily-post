import { describe, expect, it, vi } from 'vitest';
import { BlockRenderer } from '../components/blocks';
import { getByText, render } from '@/testing';

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
});
