import { describe, expect, it, vi } from 'vitest';
import { AssessmentCreateForm } from '../components/assessments';
import { changeValue, clickElement, getByLabelText, getByText, render, waitFor } from '@/testing';

describe('AssessmentCreateForm', () => {
  it('validates title before submitting', async () => {
    const onSubmit = vi.fn();
    const rendered = await render(<AssessmentCreateForm onSubmit={onSubmit} />);

    await clickElement(getByText(rendered.container, 'Create draft'));

    expect(getByText(rendered.container, 'Title is required.')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits the expected payload', async () => {
    const onSubmit = vi.fn(async () => undefined);
    const rendered = await render(<AssessmentCreateForm onSubmit={onSubmit} />);

    await changeValue(getByLabelText(rendered.container, 'Title'), 'Midterm Exam');
    await changeValue(getByLabelText(rendered.container, 'Purpose'), 'EXAM');
    await clickElement(getByText(rendered.container, 'Create draft'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Midterm Exam',
          purpose: 'EXAM',
        }),
      );
    });
  });

  it('shows pending state while submitting', async () => {
    const rendered = await render(<AssessmentCreateForm onSubmit={vi.fn()} isPending={true} />);

    expect(getByText(rendered.container, 'Creating assessment...')).toBeTruthy();
  });
});
