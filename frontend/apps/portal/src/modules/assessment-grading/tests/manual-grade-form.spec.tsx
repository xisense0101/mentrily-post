import { describe, expect, it, vi } from 'vitest';
import { changeValue, clickElement, render, waitFor } from '@/testing';
import { ManualGradeForm } from '../components/review';

const baseItem = {
  gradingRunId: 'run-1',
  answerGradeId: 'grade-1',
  attemptId: 'attempt-1',
  answerId: 'answer-1',
  assessmentId: 'assessment-1',
  snapshotId: 'snapshot-1',
  questionId: 'q-1',
  questionKind: 'LONG_ANSWER',
  maxScore: 5,
  learnerAnswer: { text: 'essay' },
  learnerPrincipalId: 'learner-1',
  status: 'PENDING_MANUAL_REVIEW',
  method: 'MANUAL_REVIEW',
} as const;

describe('ManualGradeForm', () => {
  it('validates required score and max score', async () => {
    const onSubmit = vi.fn(async () => undefined);
    const rendered = await render(<ManualGradeForm item={baseItem} onSubmit={onSubmit} />);
    const button = rendered.container.querySelector('[data-testid="manual-grade-submit-button"]') as HTMLButtonElement;
    await clickElement(button);
    await waitFor(() => expect(rendered.container.textContent).toContain('Score is required.'));

    const scoreInput = rendered.container.querySelector('[data-testid="manual-grade-score-input"]') as HTMLInputElement;
    await changeValue(scoreInput, '8');
    await clickElement(button);
    await waitFor(() => expect(rendered.container.textContent).toContain('greater than max score'));
  });

  it('submits valid score and feedback', async () => {
    const onSubmit = vi.fn(async () => undefined);
    const rendered = await render(<ManualGradeForm item={baseItem} onSubmit={onSubmit} />);
    await changeValue(rendered.container.querySelector('[data-testid="manual-grade-score-input"]') as HTMLInputElement, '4');
    await changeValue(rendered.container.querySelector('[data-testid="manual-grade-feedback-input"]') as HTMLTextAreaElement, 'clear explanation');
    await clickElement(rendered.container.querySelector('[data-testid="manual-grade-submit-button"]') as HTMLButtonElement);
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('answer-1', { score: 4, feedback: { note: 'clear explanation' } }));
  });

  it('disables form when already graded', async () => {
    const rendered = await render(<ManualGradeForm item={{ ...baseItem, status: 'MANUALLY_GRADED' }} onSubmit={vi.fn()} />);
    const button = rendered.container.querySelector('[data-testid="manual-grade-submit-button"]') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });
});
