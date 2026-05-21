import { describe, expect, it } from 'vitest';
import { QuestionRenderer } from '../components/questions';
import { getByText, render } from '@/testing';
import type { AssessmentQuestionContract } from '../types';

function makeQuestion(
  kind: AssessmentQuestionContract['kind'],
  overrides: Partial<AssessmentQuestionContract> = {},
): AssessmentQuestionContract {
  return {
    id: `q-${kind}`,
    kind,
    title: `${kind} question`,
    prompt: { text: 'What is the answer?' },
    options:
      kind === 'MCQ' || kind === 'MULTI_SELECT'
        ? [
            { id: 'opt-a', label: 'Option A', value: 'a', isCorrect: false },
            { id: 'opt-b', label: 'Option B', value: 'b', isCorrect: false },
          ]
        : kind === 'TRUE_FALSE'
          ? [
              { id: 'true-opt', label: 'True', value: 'true', isCorrect: false },
              { id: 'false-opt', label: 'False', value: 'false', isCorrect: false },
            ]
          : [],
    answerKey:
      kind === 'SHORT_ANSWER'
        ? { acceptedTextAnswers: ['Example answer'] }
        : kind === 'LONG_ANSWER'
          ? { metadata: { rubricPlaceholder: 'Grade for reasoning' } }
          : kind === 'CODE'
            ? { expectedOutput: '42' }
            : undefined,
    points: 1,
    gradingMode: kind === 'LONG_ANSWER' || kind === 'CODE' ? 'MANUAL' : 'AUTO',
    position: 0,
    ...overrides,
  };
}

describe('QuestionRenderer', () => {
  it('renders MCQ question', async () => {
    const question = makeQuestion('MCQ');
    const rendered = await render(<QuestionRenderer question={question} />);
    expect(getByText(rendered.container, 'MCQ')).toBeTruthy();
    expect(rendered.container.querySelector('[data-testid="option-editor"]')).toBeTruthy();
  });

  it('renders MULTI_SELECT question', async () => {
    const question = makeQuestion('MULTI_SELECT');
    const rendered = await render(<QuestionRenderer question={question} />);
    expect(getByText(rendered.container, 'Multi-select')).toBeTruthy();
  });

  it('renders TRUE_FALSE question', async () => {
    const question = makeQuestion('TRUE_FALSE');
    const rendered = await render(<QuestionRenderer question={question} />);
    expect(getByText(rendered.container, 'True/False')).toBeTruthy();
  });

  it('renders SHORT_ANSWER question', async () => {
    const question = makeQuestion('SHORT_ANSWER');
    const rendered = await render(<QuestionRenderer question={question} />);
    expect(getByText(rendered.container, 'Short answer')).toBeTruthy();
  });

  it('renders CODE question as placeholder', async () => {
    const question = makeQuestion('CODE');
    const rendered = await render(<QuestionRenderer question={question} />);
    expect(getByText(rendered.container, 'Code')).toBeTruthy();
    expect(getByText(rendered.container, 'Code question — structural placeholder')).toBeTruthy();
  });

  it('uses backend-compatible answer key fields for short answer questions', async () => {
    const question = makeQuestion('SHORT_ANSWER');
    expect(question.answerKey).toMatchObject({
      acceptedTextAnswers: ['Example answer'],
    });
    expect(question.gradingMode).toBe('AUTO');
  });

  it('uses backend-compatible placeholder answer key fields for code questions', async () => {
    const question = makeQuestion('CODE');
    expect(question.answerKey).toMatchObject({ expectedOutput: '42' });
    expect(question.gradingMode).toBe('MANUAL');
  });

  it('renders unknown question kind as placeholder', async () => {
    const question = makeQuestion('NOTEBOOK');
    const rendered = await render(<QuestionRenderer question={question} />);
    expect(rendered.container.querySelector('[data-testid="question-placeholder"]')).toBeTruthy();
  });

  it('renders reading passage editor without answer key controls', async () => {
    const question = makeQuestion('READING_PASSAGE', {
      prompt: {
        text: 'Read the passage.',
        passageTitle: 'Passage heading',
        passageBody: 'Line one\nLine two',
      },
      points: 0,
      gradingMode: 'MANUAL',
    });
    const rendered = await render(<QuestionRenderer question={question} />);
    expect(rendered.container.textContent).toContain('Reading passage context block');
    expect(rendered.container.textContent).not.toContain('Accepted answers');
  });

  it('renders file upload placeholder editor', async () => {
    const question = makeQuestion('FILE_UPLOAD', {
      gradingMode: 'MANUAL',
      metadata: {
        allowedFileCategories: ['document', 'image'],
        maxFiles: 2,
        maxFileSizeMb: 25,
        placeholderOnly: true,
      },
    });
    const rendered = await render(<QuestionRenderer question={question} />);
    expect(rendered.container.textContent).toContain('File upload placeholder only');
    expect(rendered.container.textContent).toContain('Media Library');
  });
});
