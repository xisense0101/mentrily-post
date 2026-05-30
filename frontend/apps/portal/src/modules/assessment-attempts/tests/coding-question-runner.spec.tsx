import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CodingQuestionRunner } from '../components/answers/coding-question-runner';
import { clickElement, render, waitFor } from '@/testing';
import type { AssessmentQuestionContract, AssessmentAttemptAnswerContract } from '../types';
import type {
  CodeExecutionLanguageContract,
  CodeExecutionResultContract,
} from '@/contracts/code-execution';

function makeCodeQuestion(
  overrides?: Partial<AssessmentQuestionContract>,
): AssessmentQuestionContract {
  return {
    id: 'question-code-1',
    kind: 'CODE',
    title: 'Write a function',
    prompt: { text: 'Write a function that returns the sum of two numbers.' },
    options: [],
    points: 5,
    gradingMode: 'MANUAL',
    position: 0,
    ...overrides,
  };
}

function makeCodeQuestionWithPublicTests(): AssessmentQuestionContract {
  return makeCodeQuestion({
    metadata: {
      publicTestCases: [
        { input: '1 2', expectedOutput: '3' },
        { input: '10 20', expectedOutput: '30' },
      ],
    },
  });
}

function makeSavedAnswer(): AssessmentAttemptAnswerContract {
  return {
    id: 'answer-1',
    questionId: 'question-code-1',
    questionKind: 'CODE',
    answer: { language: 'python', sourceCode: 'def add(a, b): return a + b' },
    status: 'DRAFT',
    savedAt: new Date().toISOString(),
    metadata: {},
  };
}

function makeLanguages(): CodeExecutionLanguageContract[] {
  return [
    { id: 'python', displayName: 'Python 3', fileExtension: '.py', defaultTemplate: '# Python\n' },
    { id: 'javascript', displayName: 'JavaScript', fileExtension: '.js' },
  ];
}

function makeSuccessResult(): CodeExecutionResultContract {
  return {
    status: 'COMPLETED',
    verdict: 'ACCEPTED',
    language: 'python',
    stdout: 'hello\n',
    stderr: null,
    compileOutput: null,
    executionTimeMs: 42,
  };
}

function makeExecutionClient(
  langOverride?: () => Promise<CodeExecutionLanguageContract[]>,
  runOverride?: () => Promise<CodeExecutionResultContract>,
) {
  return {
    getCodeExecutionLanguages: langOverride ?? vi.fn(async () => makeLanguages()),
    runCodeSample: runOverride ?? vi.fn(async () => makeSuccessResult()),
  };
}

const baseProps = {
  assessmentId: 'assessment-1',
  attemptId: 'attempt-1',
  canEdit: true,
  isSaving: false,
  onSave: vi.fn(async () => undefined),
};

describe('CodingQuestionRunner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders coding-question-runner container', async () => {
    const client = makeExecutionClient();
    const rendered = await render(
      <CodingQuestionRunner
        {...baseProps}
        question={makeCodeQuestion()}
        executionClient={client}
      />,
    );
    expect(rendered.container.querySelector('[data-testid="coding-question-runner"]')).toBeTruthy();
  });

  it('shows language loading state initially', async () => {
    let resolveLanguages!: (langs: CodeExecutionLanguageContract[]) => void;
    const langPromise = new Promise<CodeExecutionLanguageContract[]>((resolve) => {
      resolveLanguages = resolve;
    });
    const client = makeExecutionClient(() => langPromise);

    const rendered = await render(
      <CodingQuestionRunner
        {...baseProps}
        question={makeCodeQuestion()}
        executionClient={client}
      />,
    );

    expect(rendered.container.querySelector('[data-testid="lang-loading"]')).toBeTruthy();
    resolveLanguages(makeLanguages());
    await waitFor(() => {
      expect(rendered.container.querySelector('[data-testid="lang-loading"]')).toBeNull();
    });
  });

  it('renders language selector with allowed languages after load', async () => {
    const client = makeExecutionClient();
    const rendered = await render(
      <CodingQuestionRunner
        {...baseProps}
        question={makeCodeQuestion()}
        executionClient={client}
      />,
    );

    await waitFor(() => {
      const selector = rendered.container.querySelector(
        '[data-testid="lang-selector"]',
      ) as HTMLSelectElement | null;
      expect(selector).toBeTruthy();
      expect(selector!.options.length).toBe(2);
    });
  });

  it('shows lang-error state when language load fails', async () => {
    const client = makeExecutionClient(() => Promise.reject(new Error('Network error')));
    const rendered = await render(
      <CodingQuestionRunner
        {...baseProps}
        question={makeCodeQuestion()}
        executionClient={client}
      />,
    );

    await waitFor(() => {
      expect(rendered.container.querySelector('[data-testid="lang-error"]')).toBeTruthy();
    });
  });

  it('initializes code from saved answer', async () => {
    const client = makeExecutionClient();
    const rendered = await render(
      <CodingQuestionRunner
        {...baseProps}
        question={makeCodeQuestion()}
        answer={makeSavedAnswer()}
        executionClient={client}
      />,
    );

    await waitFor(() => {
      const editor = rendered.container.querySelector(
        '[data-testid="code-editor"]',
      ) as HTMLTextAreaElement | null;
      expect(editor).toBeTruthy();
      expect(editor!.value).toBe('def add(a, b): return a + b');
    });
  });

  it('disables all controls in read-only mode', async () => {
    const client = makeExecutionClient();
    const rendered = await render(
      <CodingQuestionRunner
        {...baseProps}
        question={makeCodeQuestion()}
        canEdit={false}
        executionClient={client}
      />,
    );

    await waitFor(() => {
      const runBtn = rendered.container.querySelector(
        '[data-testid="run-code-button"]',
      ) as HTMLButtonElement | null;
      expect(runBtn).toBeTruthy();
      expect(runBtn!.disabled).toBe(true);

      const saveBtn = rendered.container.querySelector(
        '[data-testid="attempt-save-answer-button"]',
      ) as HTMLButtonElement | null;
      expect(saveBtn).toBeTruthy();
      expect(saveBtn!.disabled).toBe(true);
    });
  });

  it('disables run button while running', async () => {
    let resolveRun!: (r: CodeExecutionResultContract) => void;
    const runPromise = new Promise<CodeExecutionResultContract>((resolve) => {
      resolveRun = resolve;
    });
    const client = makeExecutionClient(undefined, () => runPromise);

    const rendered = await render(
      <CodingQuestionRunner
        {...baseProps}
        question={makeCodeQuestion()}
        answer={makeSavedAnswer()}
        executionClient={client}
      />,
    );

    await waitFor(() => {
      expect(rendered.container.querySelector('[data-testid="lang-selector"]')).toBeTruthy();
    });

    const runBtn = rendered.container.querySelector(
      '[data-testid="run-code-button"]',
    ) as HTMLButtonElement;
    await clickElement(runBtn);

    await waitFor(() => {
      expect(runBtn.disabled).toBe(true);
      expect(runBtn.textContent).toContain('Running');
    });

    resolveRun(makeSuccessResult());
    await waitFor(() => {
      expect(runBtn.disabled).toBe(false);
    });
  });

  it('renders Accepted verdict after successful run', async () => {
    const client = makeExecutionClient();
    const rendered = await render(
      <CodingQuestionRunner
        {...baseProps}
        question={makeCodeQuestion()}
        answer={makeSavedAnswer()}
        executionClient={client}
      />,
    );

    await waitFor(() => {
      expect(rendered.container.querySelector('[data-testid="lang-selector"]')).toBeTruthy();
    });

    const runBtn = rendered.container.querySelector(
      '[data-testid="run-code-button"]',
    ) as HTMLButtonElement;
    await clickElement(runBtn);

    await waitFor(() => {
      const badge = rendered.container.querySelector('[data-testid="run-state-badge"]');
      expect(badge?.textContent).toContain('Accepted');
    });
  });

  it('renders Wrong answer verdict', async () => {
    const client = makeExecutionClient(undefined, async () => ({
      status: 'COMPLETED' as const,
      verdict: 'WRONG_ANSWER' as const,
      language: 'python',
      stdout: '4\n',
    }));
    const rendered = await render(
      <CodingQuestionRunner
        {...baseProps}
        question={makeCodeQuestion()}
        answer={makeSavedAnswer()}
        executionClient={client}
      />,
    );

    await waitFor(() => {
      expect(rendered.container.querySelector('[data-testid="lang-selector"]')).toBeTruthy();
    });

    const runBtn = rendered.container.querySelector(
      '[data-testid="run-code-button"]',
    ) as HTMLButtonElement;
    await clickElement(runBtn);

    await waitFor(() => {
      const badge = rendered.container.querySelector('[data-testid="run-state-badge"]');
      expect(badge?.textContent).toContain('Wrong answer');
    });
  });

  it('renders Compile error verdict', async () => {
    const client = makeExecutionClient(undefined, async () => ({
      status: 'FAILED' as const,
      verdict: 'COMPILE_ERROR' as const,
      language: 'python',
      compileOutput: 'SyntaxError: invalid syntax',
    }));
    const rendered = await render(
      <CodingQuestionRunner
        {...baseProps}
        question={makeCodeQuestion()}
        answer={makeSavedAnswer()}
        executionClient={client}
      />,
    );

    await waitFor(() => {
      expect(rendered.container.querySelector('[data-testid="lang-selector"]')).toBeTruthy();
    });

    await clickElement(
      rendered.container.querySelector('[data-testid="run-code-button"]') as HTMLButtonElement,
    );

    await waitFor(() => {
      const badge = rendered.container.querySelector('[data-testid="run-state-badge"]');
      expect(badge?.textContent).toContain('Compile error');
      const panel = rendered.container.querySelector('[data-testid="compile-output"]');
      // Text content, not HTML
      expect(panel?.textContent).toContain('SyntaxError');
    });
  });

  it('renders Runtime error verdict', async () => {
    const client = makeExecutionClient(undefined, async () => ({
      status: 'FAILED' as const,
      verdict: 'RUNTIME_ERROR' as const,
      language: 'python',
      stderr: 'ZeroDivisionError',
    }));
    const rendered = await render(
      <CodingQuestionRunner
        {...baseProps}
        question={makeCodeQuestion()}
        answer={makeSavedAnswer()}
        executionClient={client}
      />,
    );

    await waitFor(() =>
      expect(rendered.container.querySelector('[data-testid="lang-selector"]')).toBeTruthy(),
    );
    await clickElement(
      rendered.container.querySelector('[data-testid="run-code-button"]') as HTMLButtonElement,
    );

    await waitFor(() => {
      const badge = rendered.container.querySelector('[data-testid="run-state-badge"]');
      expect(badge?.textContent).toContain('Runtime error');
    });
  });

  it('renders Time limit exceeded verdict', async () => {
    const client = makeExecutionClient(undefined, async () => ({
      status: 'FAILED' as const,
      verdict: 'TIME_LIMIT_EXCEEDED' as const,
      language: 'python',
    }));
    const rendered = await render(
      <CodingQuestionRunner
        {...baseProps}
        question={makeCodeQuestion()}
        answer={makeSavedAnswer()}
        executionClient={client}
      />,
    );

    await waitFor(() =>
      expect(rendered.container.querySelector('[data-testid="lang-selector"]')).toBeTruthy(),
    );
    await clickElement(
      rendered.container.querySelector('[data-testid="run-code-button"]') as HTMLButtonElement,
    );

    await waitFor(() => {
      const badge = rendered.container.querySelector('[data-testid="run-state-badge"]');
      expect(badge?.textContent).toContain('Time limit exceeded');
    });
  });

  it('renders Provider unavailable verdict', async () => {
    const client = makeExecutionClient(undefined, async () => ({
      status: 'FAILED' as const,
      verdict: 'PROVIDER_UNAVAILABLE' as const,
      language: 'python',
    }));
    const rendered = await render(
      <CodingQuestionRunner
        {...baseProps}
        question={makeCodeQuestion()}
        answer={makeSavedAnswer()}
        executionClient={client}
      />,
    );

    await waitFor(() =>
      expect(rendered.container.querySelector('[data-testid="lang-selector"]')).toBeTruthy(),
    );
    await clickElement(
      rendered.container.querySelector('[data-testid="run-code-button"]') as HTMLButtonElement,
    );

    await waitFor(() => {
      const badge = rendered.container.querySelector('[data-testid="run-state-badge"]');
      expect(badge?.textContent).toContain('Provider unavailable');
    });
  });

  it('renders stdout and stderr as text — not HTML', async () => {
    const xssPayload = '<script>alert(1)</script>';
    const client = makeExecutionClient(undefined, async () => ({
      status: 'COMPLETED' as const,
      verdict: 'ACCEPTED' as const,
      language: 'python',
      stdout: xssPayload,
      stderr: xssPayload,
    }));
    const rendered = await render(
      <CodingQuestionRunner
        {...baseProps}
        question={makeCodeQuestion()}
        answer={makeSavedAnswer()}
        executionClient={client}
      />,
    );

    await waitFor(() =>
      expect(rendered.container.querySelector('[data-testid="lang-selector"]')).toBeTruthy(),
    );
    await clickElement(
      rendered.container.querySelector('[data-testid="run-code-button"]') as HTMLButtonElement,
    );

    await waitFor(() => {
      const stdoutPanel = rendered.container.querySelector('[data-testid="stdout-output"]');
      expect(stdoutPanel).toBeTruthy();
      // Must not contain a live <script> element — text was rendered safely
      expect(stdoutPanel!.querySelector('script')).toBeNull();
      // Text content preserved
      expect(stdoutPanel!.textContent).toContain('alert(1)');
    });
  });

  it('shows public test cases when question has them', async () => {
    const client = makeExecutionClient();
    const rendered = await render(
      <CodingQuestionRunner
        {...baseProps}
        question={makeCodeQuestionWithPublicTests()}
        executionClient={client}
      />,
    );

    await waitFor(() => {
      expect(rendered.container.querySelector('[data-testid="public-test-cases"]')).toBeTruthy();
      expect(rendered.container.querySelector('[data-testid="public-test-case-0"]')).toBeTruthy();
      expect(rendered.container.querySelector('[data-testid="public-test-case-1"]')).toBeTruthy();
    });
  });

  it('does not render hidden-test copy anywhere', async () => {
    const client = makeExecutionClient();
    const rendered = await render(
      <CodingQuestionRunner
        {...baseProps}
        question={makeCodeQuestion()}
        executionClient={client}
      />,
    );

    await waitFor(() => {
      // Should contain the public/sample notice but never mention "hidden grading tests" as if exposing them
      // The notice says they are NOT shown here
      const text = rendered.container.textContent ?? '';
      expect(text).not.toContain('hidden expected output');
      expect(text).not.toContain('hiddenTest');
    });
  });

  it('does not expose provider internals in UI', async () => {
    const client = makeExecutionClient(undefined, async () => ({
      status: 'COMPLETED' as const,
      verdict: 'ACCEPTED' as const,
      language: 'python',
      stdout: 'ok',
    }));
    const rendered = await render(
      <CodingQuestionRunner
        {...baseProps}
        question={makeCodeQuestion()}
        answer={makeSavedAnswer()}
        executionClient={client}
      />,
    );

    await waitFor(() =>
      expect(rendered.container.querySelector('[data-testid="lang-selector"]')).toBeTruthy(),
    );
    await clickElement(
      rendered.container.querySelector('[data-testid="run-code-button"]') as HTMLButtonElement,
    );

    await waitFor(() => {
      const text = rendered.container.textContent ?? '';
      expect(text).not.toContain('providerUrl');
      expect(text).not.toContain('submissionToken');
      expect(text).not.toContain('containerId');
      expect(text).not.toContain('queueId');
      expect(text).not.toContain('JUDGE0');
      expect(text).not.toContain('PISTON');
    });
  });

  it('calls onSave with coding answer payload when Save is clicked', async () => {
    const onSave = vi.fn(async () => undefined);
    const client = makeExecutionClient();
    const rendered = await render(
      <CodingQuestionRunner
        {...baseProps}
        question={makeCodeQuestion()}
        answer={makeSavedAnswer()}
        executionClient={client}
        onSave={onSave}
      />,
    );

    await waitFor(() => {
      expect(
        rendered.container.querySelector('[data-testid="attempt-save-answer-button"]'),
      ).toBeTruthy();
    });

    const saveBtn = rendered.container.querySelector(
      '[data-testid="attempt-save-answer-button"]',
    ) as HTMLButtonElement;
    await clickElement(saveBtn);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          language: expect.any(String),
          sourceCode: expect.any(String),
        }),
      );
    });
  });

  it('shows save succeeded state', async () => {
    const client = makeExecutionClient();
    const rendered = await render(
      <CodingQuestionRunner
        {...baseProps}
        question={makeCodeQuestion()}
        executionClient={client}
        saveSucceeded={true}
      />,
    );

    await waitFor(() => {
      expect(rendered.container.querySelector('[data-testid="attempt-save-success"]')).toBeTruthy();
    });
  });

  it('shows save conflict state', async () => {
    const client = makeExecutionClient();
    const rendered = await render(
      <CodingQuestionRunner
        {...baseProps}
        question={makeCodeQuestion()}
        executionClient={client}
        saveConflict={true}
      />,
    );

    await waitFor(() => {
      expect(
        rendered.container.querySelector('[data-testid="attempt-save-conflict"]'),
      ).toBeTruthy();
    });
  });

  it('renders per-public-test results after PUBLIC_TEST_RUN', async () => {
    const client = makeExecutionClient(undefined, async () => ({
      status: 'COMPLETED' as const,
      verdict: 'ACCEPTED' as const,
      language: 'python',
      testResults: [
        {
          input: '1 2',
          expectedOutput: '3',
          stdout: '3\n',
          passed: true,
          verdict: 'ACCEPTED' as const,
        },
        {
          input: '10 20',
          expectedOutput: '30',
          stdout: '30\n',
          passed: true,
          verdict: 'ACCEPTED' as const,
        },
      ],
    }));
    const rendered = await render(
      <CodingQuestionRunner
        {...baseProps}
        question={makeCodeQuestionWithPublicTests()}
        answer={makeSavedAnswer()}
        executionClient={client}
      />,
    );

    await waitFor(() =>
      expect(rendered.container.querySelector('[data-testid="lang-selector"]')).toBeTruthy(),
    );
    await clickElement(
      rendered.container.querySelector('[data-testid="run-code-button"]') as HTMLButtonElement,
    );

    await waitFor(() => {
      expect(rendered.container.querySelector('[data-testid="test-results"]')).toBeTruthy();
      expect(rendered.container.querySelector('[data-testid="test-result-0"]')).toBeTruthy();
      expect(rendered.container.querySelector('[data-testid="test-result-1"]')).toBeTruthy();
    });
  });

  it('consumes allowedLanguages, starterCodeByLanguage, and publicSampleTestCases from codingLearnerConfig', async () => {
    const client = makeExecutionClient();
    const configQuestion = makeCodeQuestion({
      answerKey: {
        codingLearnerConfig: {
          allowedLanguages: ['javascript'],
          starterCodeByLanguage: {
            javascript: '// custom starter code',
          },
          publicSampleTestCases: [
            { id: 'sample-1', input: 'input-val', expectedOutput: 'expected-val' },
          ],
        },
      },
    });

    const rendered = await render(
      <CodingQuestionRunner {...baseProps} question={configQuestion} executionClient={client} />,
    );

    // 1. Verify language selector only shows javascript (python should be filtered out)
    await waitFor(() => {
      const selector = rendered.container.querySelector(
        '[data-testid="lang-selector"]',
      ) as HTMLSelectElement | null;
      expect(selector).toBeTruthy();
      expect(selector!.options.length).toBe(1);
      expect(selector!.options[0].value).toBe('javascript');
    });

    // 2. Verify custom starter code is loaded into editor
    const editor = rendered.container.querySelector(
      '[data-testid="code-editor"]',
    ) as HTMLTextAreaElement | null;
    expect(editor).toBeTruthy();
    expect(editor!.value).toBe('// custom starter code');

    // 3. Verify public test case from codingLearnerConfig is rendered
    expect(rendered.container.querySelector('[data-testid="public-test-cases"]')).toBeTruthy();
    expect(rendered.container.querySelector('[data-testid="public-test-case-0"]')).toBeTruthy();
    expect(rendered.container.textContent).toContain('input-val');
    expect(rendered.container.textContent).toContain('expected-val');
  });
});
