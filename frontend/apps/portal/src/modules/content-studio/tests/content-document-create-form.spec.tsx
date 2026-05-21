import { describe, expect, it, vi } from 'vitest';
import { ContentDocumentCreateForm } from '../components/documents';
import { changeValue, clickElement, getByLabelText, getByText, render, waitFor } from '@/testing';

describe('ContentDocumentCreateForm', () => {
  it('validates title before submitting', async () => {
    const onSubmit = vi.fn();
    const rendered = await render(<ContentDocumentCreateForm onSubmit={onSubmit} />);

    await clickElement(getByText(rendered.container, 'Create draft'));

    expect(getByText(rendered.container, 'Title is required.')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits the expected payload', async () => {
    const onSubmit = vi.fn(async () => undefined);
    const rendered = await render(<ContentDocumentCreateForm onSubmit={onSubmit} />);

    await changeValue(getByLabelText(rendered.container, 'Title'), 'Studio Page');
    await changeValue(getByLabelText(rendered.container, 'Purpose'), 'COURSE_CONTENT');
    await clickElement(getByText(rendered.container, 'Create draft'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        title: 'Studio Page',
        purpose: 'COURSE_CONTENT',
      });
    });
  });
});
