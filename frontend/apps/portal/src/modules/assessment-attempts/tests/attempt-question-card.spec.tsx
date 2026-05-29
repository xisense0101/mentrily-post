import { describe, expect, it, vi } from 'vitest';
import { AttemptQuestionCard } from '../components/attempt';
import { changeValue, clickElement, render, waitFor } from '@/testing';
import type { AssessmentQuestionContract } from '../types';

function makeQuestion(kind: AssessmentQuestionContract['kind']): AssessmentQuestionContract {
  return {
    id: `question-${kind}`,
    kind,
    title: `${kind} title`,
    prompt: { text: `${kind} prompt` },
    options:
      kind === 'MCQ'
        ? [
            { id: 'option-1', label: 'Option 1' },
            { id: 'option-2', label: 'Option 2' },
          ]
        : kind === 'MULTI_SELECT'
          ? [
              { id: 'option-a', label: 'Option A' },
              { id: 'option-b', label: 'Option B' },
            ]
          : kind === 'TRUE_FALSE'
            ? [
                { id: 'true', label: 'True' },
                { id: 'false', label: 'False' },
              ]
            : [],
    points: 1,
    gradingMode: kind === 'MCQ' || kind === 'TRUE_FALSE' ? 'AUTO' : 'MANUAL',
    position: 0,
  };
}

const baseProps = {
  assessmentId: 'assessment_1',
  attemptId: 'attempt_1',
};

describe('AttemptQuestionCard', () => {
  it('renders and saves MCQ answers', async () => {
    const onSave = vi.fn(async () => undefined);
    const rendered = await render(
      <AttemptQuestionCard
        {...baseProps}
        isSaving={false}
        onSave={onSave}
        question={makeQuestion('MCQ')}
        readOnly={false}
      />,
    );

    const radio = rendered.container.querySelector('input[type="radio"]') as HTMLInputElement;
    await clickElement(radio);
    await clickElement(
      rendered.container.querySelector(
        '[data-testid="attempt-save-answer-button"]',
      ) as HTMLButtonElement,
    );

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith('option-1');
    });
  });

  it('renders multi-select input', async () => {
    const rendered = await render(
      <AttemptQuestionCard
        {...baseProps}
        isSaving={false}
        onSave={vi.fn(async () => undefined)}
        question={makeQuestion('MULTI_SELECT')}
        readOnly={false}
      />,
    );

    expect(rendered.container.querySelectorAll('input[type="checkbox"]').length).toBe(2);
  });

  it('renders true-false input', async () => {
    const rendered = await render(
      <AttemptQuestionCard
        {...baseProps}
        isSaving={false}
        onSave={vi.fn(async () => undefined)}
        question={makeQuestion('TRUE_FALSE')}
        readOnly={false}
      />,
    );

    expect(rendered.container.querySelectorAll('input[type="radio"]').length).toBe(2);
  });

  it('renders short answer input', async () => {
    const rendered = await render(
      <AttemptQuestionCard
        {...baseProps}
        isSaving={false}
        onSave={vi.fn(async () => undefined)}
        question={makeQuestion('SHORT_ANSWER')}
        readOnly={false}
      />,
    );

    expect(rendered.container.querySelector('input[type="text"]')).toBeTruthy();
  });

  it('renders long answer input', async () => {
    const rendered = await render(
      <AttemptQuestionCard
        {...baseProps}
        isSaving={false}
        onSave={vi.fn(async () => undefined)}
        question={makeQuestion('LONG_ANSWER')}
        readOnly={false}
      />,
    );

    expect(rendered.container.querySelector('textarea')).toBeTruthy();
  });

  it('renders coding question runner for CODE kind', async () => {
    const rendered = await render(
      <AttemptQuestionCard
        {...baseProps}
        isSaving={false}
        onSave={vi.fn(async () => undefined)}
        question={makeQuestion('CODE')}
        readOnly={false}
      />,
    );

    // CodingQuestionRunner renders language loading state initially
    expect(rendered.container.querySelector('[data-testid="coding-question-runner"]')).toBeTruthy();
  });

  it('disables editing in read-only mode', async () => {
    const rendered = await render(
      <AttemptQuestionCard
        {...baseProps}
        isSaving={false}
        onSave={vi.fn(async () => undefined)}
        question={makeQuestion('SHORT_ANSWER')}
        readOnly={true}
      />,
    );

    const input = rendered.container.querySelector('input[type="text"]') as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });

  it('saves long text answers', async () => {
    const onSave = vi.fn(async () => undefined);
    const rendered = await render(
      <AttemptQuestionCard
        {...baseProps}
        isSaving={false}
        onSave={onSave}
        question={makeQuestion('LONG_ANSWER')}
        readOnly={false}
      />,
    );

    const textarea = rendered.container.querySelector('textarea') as HTMLTextAreaElement;
    await changeValue(textarea, 'Long answer text');
    await clickElement(
      rendered.container.querySelector(
        '[data-testid="attempt-save-answer-button"]',
      ) as HTMLButtonElement,
    );

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith('Long answer text');
    });
  });

  it('renders reading passage without a save button', async () => {
    const rendered = await render(
      <AttemptQuestionCard
        {...baseProps}
        isSaving={false}
        onSave={vi.fn(async () => undefined)}
        question={makeQuestion('READING_PASSAGE')}
        readOnly={true}
      />,
    );

    expect(
      rendered.container.querySelector('[data-testid="reading-passage-display"]'),
    ).toBeTruthy();
    expect(
      rendered.container.querySelector('[data-testid="attempt-save-answer-button"]'),
    ).toBeNull();
  });

  it('renders file upload answer with uploader controls', async () => {
    const rendered = await render(
      <AttemptQuestionCard
        {...baseProps}
        isSaving={false}
        onSave={vi.fn(async () => undefined)}
        question={makeQuestion('FILE_UPLOAD')}
        readOnly={false}
      />,
    );

    const button = rendered.container.querySelector(
      '[data-testid="attempt-save-answer-button"]',
    ) as HTMLButtonElement;
    expect(rendered.container.querySelector('[data-testid="file-upload-answer"]')).toBeTruthy();
    expect(button.disabled).toBe(false);
  });

  it('renders save loading, success, and error states', async () => {
    const rendered = await render(
      <AttemptQuestionCard
        {...baseProps}
        isSaving={true}
        onSave={vi.fn(async () => undefined)}
        question={makeQuestion('SHORT_ANSWER')}
        readOnly={false}
        saveError="Retry save"
        saveSucceeded={true}
      />,
    );

    expect(rendered.container.textContent).toContain('Saving...');
    expect(rendered.container.textContent).toContain('Answer saved.');
    expect(rendered.container.textContent).toContain('Retry save');
  });

  it('renders a safe conflict state', async () => {
    const rendered = await render(
      <AttemptQuestionCard
        {...baseProps}
        isSaving={false}
        onSave={vi.fn(async () => undefined)}
        question={makeQuestion('SHORT_ANSWER')}
        readOnly={false}
        saveConflict={true}
      />,
    );

    expect(rendered.container.textContent).toContain(
      'Server state changed. Refresh before continuing.',
    );
  });
});
