import { describe, expect, it, vi } from 'vitest';
import { EditableCodeQuestion } from '../components/questions/editable-code-question';
import { getByText, render } from '@/testing';
import { fireEvent } from '@testing-library/react';
import type { AssessmentQuestionContract } from '../types';

describe('EditableCodeQuestion Component', () => {
  const baseQuestion: AssessmentQuestionContract = {
    id: 'q-code',
    kind: 'CODE',
    title: 'Code Question',
    prompt: { text: 'Write a function' },
    options: [],
    points: 10,
    gradingMode: 'AUTO',
    position: 0,
    answerKey: {
      codingConfig: {
        allowedLanguages: ['javascript'],
        starterCodeByLanguage: {
          javascript: '// JS Starter',
        },
        publicSampleTestCases: [{ id: 'sample-1', input: 'input1', expectedOutput: 'output1' }],
        publicGradedTestCases: [
          { id: 'public-1', input: 'input2', expectedOutput: 'output2', weight: 1 },
        ],
        hiddenGradedTestCases: [
          { id: 'hidden-1', input: 'input3', expectedOutput: 'output3', weight: 2 },
        ],
      },
    },
  };

  it('renders allowed languages list', async () => {
    const rendered = await render(<EditableCodeQuestion question={baseQuestion} />);
    expect(getByText(rendered.container, 'Allowed Languages')).toBeTruthy();
    expect(
      rendered.container.querySelector('[data-testid="allowed-language-javascript"]'),
    ).toBeTruthy();
    expect(
      rendered.container.querySelector('[data-testid="allowed-language-python"]'),
    ).toBeTruthy();
  });

  it('toggles allowed languages and invokes onUpdate', async () => {
    const onUpdate = vi.fn();
    const rendered = await render(
      <EditableCodeQuestion question={baseQuestion} onUpdate={onUpdate} />,
    );
    const pythonBtn = rendered.container.querySelector(
      '[data-testid="allowed-language-python"]',
    ) as HTMLButtonElement;
    await fireEvent.click(pythonBtn);

    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        answerKey: expect.objectContaining({
          codingConfig: expect.objectContaining({
            allowedLanguages: expect.arrayContaining(['javascript', 'python']),
          }),
        }),
      }),
    );
  });

  it('edits starter code and invokes onUpdate', async () => {
    const onUpdate = vi.fn();
    const rendered = await render(
      <EditableCodeQuestion question={baseQuestion} onUpdate={onUpdate} />,
    );
    const textarea = rendered.container.querySelector(
      '[data-testid="starter-code-textarea"]',
    ) as HTMLTextAreaElement;
    await fireEvent.change(textarea, { target: { value: '// Modified starter code' } });

    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        answerKey: expect.objectContaining({
          codingConfig: expect.objectContaining({
            starterCodeByLanguage: expect.objectContaining({
              javascript: '// Modified starter code',
            }),
          }),
        }),
      }),
    );
  });

  it('toggles test case category tabs', async () => {
    const rendered = await render(<EditableCodeQuestion question={baseQuestion} />);

    // Default tab is 'sample'
    expect(rendered.container.textContent).toContain('input1');
    expect(rendered.container.textContent).not.toContain('input2');

    // Switch to Public Graded
    const gradedTab = rendered.container.querySelector(
      '[data-testid="test-case-tab-public_graded"]',
    ) as HTMLButtonElement;
    await fireEvent.click(gradedTab);
    expect(rendered.container.textContent).toContain('input2');
    expect(rendered.container.textContent).not.toContain('input1');
  });

  it('triggers onUpdate when adding a new test case', async () => {
    const onUpdate = vi.fn();
    const rendered = await render(
      <EditableCodeQuestion question={baseQuestion} onUpdate={onUpdate} />,
    );
    const addBtn = rendered.container.querySelector(
      '[data-testid="add-test-case-button"]',
    ) as HTMLButtonElement;
    await fireEvent.click(addBtn);

    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        answerKey: expect.objectContaining({
          codingConfig: expect.objectContaining({
            publicSampleTestCases: expect.arrayContaining([
              expect.objectContaining({ id: expect.any(String) }),
            ]),
          }),
        }),
      }),
    );
  });

  it('renders validation warning for empty languages', async () => {
    const questionWithNoLangs: AssessmentQuestionContract = {
      ...baseQuestion,
      answerKey: {
        codingConfig: {
          ...baseQuestion.answerKey!.codingConfig!,
          allowedLanguages: [],
        },
      },
    };
    const rendered = await render(<EditableCodeQuestion question={questionWithNoLangs} />);
    expect(rendered.container.textContent).toContain('Select at least one allowed language.');
  });

  it('renders validation warning for duplicate test case IDs', async () => {
    const questionWithDuplicates: AssessmentQuestionContract = {
      ...baseQuestion,
      answerKey: {
        codingConfig: {
          ...baseQuestion.answerKey!.codingConfig!,
          publicSampleTestCases: [{ id: 'dup-1', input: 'in1', expectedOutput: 'out1' }],
          publicGradedTestCases: [{ id: 'dup-1', input: 'in2', expectedOutput: 'out2', weight: 1 }],
        },
      },
    };
    const rendered = await render(<EditableCodeQuestion question={questionWithDuplicates} />);
    expect(rendered.container.textContent).toContain('Duplicate test case IDs: dup-1');
  });

  it('renders validation warning for missing graded tests in AUTO mode', async () => {
    const questionWithNoGradedTests: AssessmentQuestionContract = {
      ...baseQuestion,
      gradingMode: 'AUTO',
      answerKey: {
        codingConfig: {
          ...baseQuestion.answerKey!.codingConfig!,
          publicGradedTestCases: [],
          hiddenGradedTestCases: [],
        },
      },
    };
    const rendered = await render(<EditableCodeQuestion question={questionWithNoGradedTests} />);
    expect(rendered.container.textContent).toContain(
      'Auto-graded questions require at least one graded test case (public or hidden).',
    );
  });
});
