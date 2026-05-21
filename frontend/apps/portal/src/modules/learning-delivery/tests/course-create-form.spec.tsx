import { describe, expect, it, vi } from 'vitest';
import { CourseCreateForm } from '../components/creator';
import { changeValue, clickElement, getByLabelText, getByText, render, waitFor } from '@/testing';

describe('CourseCreateForm', () => {
  it('validates title and slug before submitting', async () => {
    const onSubmit = vi.fn();
    const rendered = await render(<CourseCreateForm onSubmit={onSubmit} />);

    await clickElement(getByText(rendered.container, 'Create draft'));

    expect(getByText(rendered.container, 'Title is required.')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits the expected payload', async () => {
    const onSubmit = vi.fn(async () => undefined);
    const rendered = await render(<CourseCreateForm onSubmit={onSubmit} />);

    await changeValue(getByLabelText(rendered.container, 'Title'), 'New Course');
    await changeValue(getByLabelText(rendered.container, 'Slug'), 'new-course');
    await changeValue(getByLabelText(rendered.container, 'Visibility'), 'PRIVATE');
    await changeValue(
      getByLabelText(rendered.container, 'Description'),
      'Course description',
    );
    await clickElement(getByText(rendered.container, 'Create draft'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        title: 'New Course',
        slug: 'new-course',
        description: 'Course description',
        visibility: 'PRIVATE',
      });
    });
  });
});
