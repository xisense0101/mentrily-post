'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  CodeExecutionLanguageContract,
  CodeExecutionResultContract,
} from '@/contracts/code-execution';
import type { AssessmentQuestionContract, AssessmentAttemptAnswerContract } from '../../types';
import { codeExecutionApiClient, CodeExecutionApiError } from '@/modules/code-execution';

// ─── Safety rules enforced in this component ────────────────────────────────
// • Never sends RESERVED_GRADING_RUN
// • Never renders provider internals (providerUrl, providerApiKey, submissionToken, etc.)
// • Never renders hidden tests or hidden expected outputs
// • Never uses dangerouslySetInnerHTML for execution output
// • Never calls Judge0 / Piston directly
// • Stdout / stderr / compileOutput rendered as preformatted text only
// ─────────────────────────────────────────────────────────────────────────────

const MAX_VISIBLE_OUTPUT_CHARS = 4000;

interface CodingAnswerState {
  language: string;
  sourceCode: string;
}

interface CodingQuestionRunnerProps {
  assessmentId: string;
  attemptId: string;
  question: AssessmentQuestionContract;
  answer?: AssessmentAttemptAnswerContract | undefined;
  canEdit: boolean;
  isSaving: boolean;
  saveSucceeded?: boolean | undefined;
  saveConflict?: boolean | undefined;
  saveError?: string | undefined;
  onSave: (value: unknown) => Promise<void> | void;
  /** Injected for testing — defaults to codeExecutionApiClient */
  executionClient?: {
    getCodeExecutionLanguages: () => Promise<CodeExecutionLanguageContract[]>;
    runCodeSample: (req: {
      language: string;
      sourceCode: string;
      stdin?: string | null;
      publicTestCases?: Array<{ input: string; expectedOutput?: string }>;
      executionMode: 'SAMPLE_RUN' | 'PUBLIC_TEST_RUN';
    }) => Promise<CodeExecutionResultContract>;
  };
}

function readStringField(value: unknown, field: string): string | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const record = value as Record<string, unknown>;
  return typeof record[field] === 'string' ? (record[field] as string) : undefined;
}

function getInitialCodingState(answer?: AssessmentAttemptAnswerContract): CodingAnswerState {
  const payload = answer?.answer;
  return {
    language: readStringField(payload, 'language') ?? '',
    sourceCode: readStringField(payload, 'sourceCode') ?? '',
  };
}

/** Extract public test cases from question metadata — never hidden tests. */
function getPublicTestCases(
  question: AssessmentQuestionContract,
): Array<{ input: string; expectedOutput?: string }> {
  const meta = question.metadata;
  if (!meta || typeof meta !== 'object') return [];

  const testCases = (meta as Record<string, unknown>)['publicTestCases'];
  if (!Array.isArray(testCases)) return [];

  return testCases.flatMap((tc: unknown) => {
    if (typeof tc !== 'object' || tc === null) return [];
    const obj = tc as Record<string, unknown>;
    const input = typeof obj['input'] === 'string' ? obj['input'] : '';
    const expectedOutput =
      typeof obj['expectedOutput'] === 'string' ? obj['expectedOutput'] : undefined;
    return [{ input, ...(expectedOutput !== undefined ? { expectedOutput } : {}) }];
  });
}

/** Safely cap output for display. Does NOT use dangerouslySetInnerHTML. */
function capOutput(text: string | null | undefined): string {
  if (!text) return '';
  if (text.length <= MAX_VISIBLE_OUTPUT_CHARS) return text;
  return text.slice(0, MAX_VISIBLE_OUTPUT_CHARS) + '\n[output truncated]';
}

type RunState =
  | 'idle'
  | 'running'
  | 'success'
  | 'compile_error'
  | 'runtime_error'
  | 'timeout'
  | 'memory_limit'
  | 'output_limit'
  | 'wrong_answer'
  | 'provider_unavailable'
  | 'validation_error'
  | 'error';

function verdictToRunState(verdict: string): RunState {
  switch (verdict) {
    case 'ACCEPTED':
      return 'success';
    case 'WRONG_ANSWER':
      return 'wrong_answer';
    case 'COMPILE_ERROR':
      return 'compile_error';
    case 'RUNTIME_ERROR':
      return 'runtime_error';
    case 'TIME_LIMIT_EXCEEDED':
      return 'timeout';
    case 'MEMORY_LIMIT_EXCEEDED':
      return 'memory_limit';
    case 'OUTPUT_LIMIT_EXCEEDED':
      return 'output_limit';
    case 'PROVIDER_UNAVAILABLE':
      return 'provider_unavailable';
    case 'VALIDATION_ERROR':
      return 'validation_error';
    default:
      return 'error';
  }
}

function RunStateBadge({ state }: { state: RunState }) {
  if (state === 'idle' || state === 'running') return null;

  const config: Record<RunState, { label: string; className: string }> = {
    idle: { label: '', className: '' },
    running: { label: '', className: '' },
    success: {
      label: 'Accepted',
      className: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    },
    wrong_answer: {
      label: 'Wrong answer',
      className: 'text-amber-700 bg-amber-50 border-amber-200',
    },
    compile_error: {
      label: 'Compile error',
      className: 'text-rose-700 bg-rose-50 border-rose-200',
    },
    runtime_error: {
      label: 'Runtime error',
      className: 'text-rose-700 bg-rose-50 border-rose-200',
    },
    timeout: {
      label: 'Time limit exceeded',
      className: 'text-rose-700 bg-rose-50 border-rose-200',
    },
    memory_limit: {
      label: 'Memory limit exceeded',
      className: 'text-rose-700 bg-rose-50 border-rose-200',
    },
    output_limit: {
      label: 'Output limit exceeded',
      className: 'text-rose-700 bg-rose-50 border-rose-200',
    },
    provider_unavailable: {
      label: 'Provider unavailable. Try again later.',
      className: 'text-slate-700 bg-slate-50 border-slate-200',
    },
    validation_error: {
      label: 'Validation error',
      className: 'text-amber-700 bg-amber-50 border-amber-200',
    },
    error: { label: 'Execution error', className: 'text-rose-700 bg-rose-50 border-rose-200' },
  };

  const { label, className } = config[state];
  return (
    <span
      className={`inline-block rounded-full border px-3 py-0.5 text-xs font-semibold ${className}`}
      data-testid="run-state-badge"
    >
      {label}
    </span>
  );
}

/** Output panel — renders text only, never dangerouslySetInnerHTML. */
function OutputPanel({
  label,
  content,
  testId,
}: {
  label: string;
  content: string | null | undefined;
  testId: string;
}) {
  if (!content) return null;
  const displayed = capOutput(content);
  const truncated = content.length > MAX_VISIBLE_OUTPUT_CHARS;

  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-portal-text-muted">
        {label}
      </p>
      <pre
        className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-portal-border bg-slate-950 px-4 py-3 font-mono text-xs leading-5 text-slate-100"
        data-testid={testId}
      >
        {/* Text content only — no dangerouslySetInnerHTML */}
        {displayed}
      </pre>
      {truncated ? (
        <p className="text-xs text-portal-text-muted" data-testid="output-truncated-notice">
          Output was truncated to {MAX_VISIBLE_OUTPUT_CHARS} characters.
        </p>
      ) : null}
    </div>
  );
}

export function CodingQuestionRunner({
  question,
  answer,
  canEdit,
  isSaving,
  saveSucceeded = false,
  saveConflict = false,
  saveError,
  onSave,
  executionClient = codeExecutionApiClient,
}: CodingQuestionRunnerProps) {
  const [languages, setLanguages] = useState<CodeExecutionLanguageContract[]>([]);
  const [langLoading, setLangLoading] = useState(true);
  const [langError, setLangError] = useState<string | null>(null);

  const [coding, setCoding] = useState<CodingAnswerState>(() => getInitialCodingState(answer));

  // Reset coding state when answer changes (e.g. on refresh)
  useEffect(() => {
    setCoding(getInitialCodingState(answer));
  }, [answer]);

  const [stdin, setStdin] = useState('');
  const [runState, setRunState] = useState<RunState>('idle');
  const [runError, setRunError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<CodeExecutionResultContract | null>(null);

  const runningRef = useRef(false);

  const publicTestCases = getPublicTestCases(question);
  const hasPublicTests = publicTestCases.length > 0;

  // Load languages from backend
  useEffect(() => {
    let cancelled = false;
    setLangLoading(true);
    setLangError(null);

    executionClient
      .getCodeExecutionLanguages()
      .then((langs) => {
        if (cancelled) return;
        setLanguages(langs);

        // If saved language is valid, keep it. Otherwise pick first allowed.
        setCoding((prev) => {
          const isValid = langs.some((l) => l.id === prev.language);
          if (isValid) return prev;
          return {
            ...prev,
            language: langs[0]?.id ?? '',
            // Apply default template only if no saved source code
            sourceCode: prev.sourceCode || langs[0]?.defaultTemplate || '',
          };
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLangError(err instanceof Error ? err.message : 'Failed to load languages.');
      })
      .finally(() => {
        if (!cancelled) setLangLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [executionClient]);

  const handleLanguageChange = useCallback(
    (langId: string) => {
      const lang = languages.find((l) => l.id === langId);
      if (!lang) return;

      setCoding((prev) => ({
        language: lang.id,
        // Apply default template only when source code is empty
        sourceCode: prev.sourceCode || lang.defaultTemplate || '',
      }));
    },
    [languages],
  );

  const handleCodeChange = useCallback((code: string) => {
    setCoding((prev) => ({ ...prev, sourceCode: code }));
  }, []);

  const handleSave = useCallback(() => {
    return onSave({ language: coding.language, sourceCode: coding.sourceCode });
  }, [onSave, coding]);

  const handleRunCode = useCallback(async () => {
    if (runningRef.current) return; // double-click guard
    if (!coding.language) {
      setRunError('Select a language before running.');
      return;
    }
    if (!coding.sourceCode.trim()) {
      setRunError('Enter source code before running.');
      return;
    }

    runningRef.current = true;
    setRunState('running');
    setRunError(null);
    setLastResult(null);

    try {
      const result = await executionClient.runCodeSample({
        language: coding.language,
        sourceCode: coding.sourceCode,
        ...(hasPublicTests
          ? { publicTestCases, executionMode: 'PUBLIC_TEST_RUN' }
          : { stdin: stdin || null, executionMode: 'SAMPLE_RUN' }),
      });

      setLastResult(result);
      setRunState(verdictToRunState(result.verdict));
    } catch (err: unknown) {
      if (err instanceof CodeExecutionApiError) {
        if (err.code === 'VALIDATION_ERROR' && err.message.includes('GRADING_RUN_NOT_AVAILABLE')) {
          setRunError('Grading mode is not available from the learner runner.');
        } else {
          setRunError(err.message);
        }
      } else {
        setRunError(err instanceof Error ? err.message : 'Execution failed. Try again.');
      }
      setRunState('error');
    } finally {
      runningRef.current = false;
    }
  }, [coding, hasPublicTests, publicTestCases, stdin, executionClient]);

  const isRunning = runState === 'running';
  const promptText =
    typeof question.prompt === 'object' && question.prompt !== null
      ? (((question.prompt as Record<string, unknown>)['text'] as string | undefined) ??
        question.title)
      : question.title;

  return (
    <div className="space-y-5" data-testid="coding-question-runner">
      {/* Prompt */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-portal-text-muted">
          Code question
        </p>
        <h3 className="mt-2 text-xl font-semibold text-portal-text">{question.title}</h3>
        <p className="mt-2 text-sm leading-6 text-portal-text-muted">{promptText}</p>
        <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-portal-text-muted">
          {question.points} point{question.points === 1 ? '' : 's'}
        </p>
      </div>

      {/* Language selector */}
      <div className="space-y-1">
        <label
          className="block text-xs font-semibold uppercase tracking-[0.18em] text-portal-text-muted"
          htmlFor={`lang-select-${question.id}`}
        >
          Language
        </label>
        {langLoading ? (
          <p className="text-xs text-portal-text-muted" data-testid="lang-loading">
            Loading languages…
          </p>
        ) : langError ? (
          <p className="text-xs text-rose-600" data-testid="lang-error">
            {langError}
          </p>
        ) : languages.length === 0 ? (
          <p className="text-xs text-portal-text-muted" data-testid="lang-empty">
            No supported languages available.
          </p>
        ) : (
          <select
            className="rounded-xl border border-portal-border bg-white px-3 py-2 text-sm text-portal-text shadow-sm outline-none transition focus:border-portal-accent disabled:cursor-not-allowed disabled:opacity-60"
            data-testid="lang-selector"
            disabled={!canEdit}
            id={`lang-select-${question.id}`}
            onChange={(e) => handleLanguageChange(e.target.value)}
            value={coding.language}
          >
            {languages.map((lang) => (
              <option key={lang.id} value={lang.id}>
                {lang.displayName}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Code editor */}
      <div className="space-y-1">
        <label
          className="block text-xs font-semibold uppercase tracking-[0.18em] text-portal-text-muted"
          htmlFor={`code-editor-${question.id}`}
        >
          Code
        </label>
        <textarea
          aria-label="Code editor"
          className="min-h-[16rem] w-full rounded-2xl border border-portal-border bg-slate-950 px-4 py-3 font-mono text-sm leading-6 text-slate-100 shadow-sm outline-none transition focus:border-portal-accent disabled:cursor-not-allowed disabled:opacity-60"
          data-testid="code-editor"
          disabled={!canEdit}
          id={`code-editor-${question.id}`}
          onChange={(e) => handleCodeChange(e.target.value)}
          spellCheck={false}
          value={coding.sourceCode}
        />
      </div>

      {/* Public test cases (read-only display) — never hidden tests */}
      {hasPublicTests ? (
        <div className="space-y-2" data-testid="public-test-cases">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-portal-text-muted">
            Public test cases
          </p>
          <p className="text-xs text-portal-text-muted">
            This run uses public/sample tests only. Hidden grading tests are not shown here.
          </p>
          {publicTestCases.map((tc, idx) => (
            <div
              className="rounded-xl border border-portal-border bg-portal-surface-muted px-3 py-2 text-xs"
              key={idx}
              data-testid={`public-test-case-${idx}`}
            >
              <p className="font-mono text-slate-700">
                <span className="font-semibold">Input: </span>
                {tc.input}
              </p>
              {tc.expectedOutput !== undefined ? (
                <p className="font-mono text-slate-700">
                  <span className="font-semibold">Expected: </span>
                  {tc.expectedOutput}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        /* Stdin input for SAMPLE_RUN when no public tests */
        <div className="space-y-1">
          <label
            className="block text-xs font-semibold uppercase tracking-[0.18em] text-portal-text-muted"
            htmlFor={`stdin-input-${question.id}`}
          >
            stdin (optional)
          </label>
          <textarea
            className="min-h-[4rem] w-full rounded-xl border border-portal-border bg-white px-3 py-2 font-mono text-sm text-portal-text shadow-sm outline-none transition focus:border-portal-accent disabled:cursor-not-allowed disabled:opacity-60"
            data-testid="stdin-input"
            disabled={!canEdit}
            id={`stdin-input-${question.id}`}
            onChange={(e) => setStdin(e.target.value)}
            placeholder="Optional stdin for your code…"
            value={stdin}
          />
        </div>
      )}

      {/* Run button */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          className="rounded-full bg-portal-accent px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          data-testid="run-code-button"
          disabled={!canEdit || isRunning || langLoading || languages.length === 0}
          onClick={() => void handleRunCode()}
          type="button"
        >
          {isRunning ? 'Running code…' : 'Run sample'}
        </button>

        {runState !== 'idle' && !isRunning ? <RunStateBadge state={runState} /> : null}
      </div>

      {runError ? (
        <p className="text-sm text-rose-600" data-testid="run-error">
          {runError}
        </p>
      ) : null}

      {/* Execution result panel */}
      {lastResult ? (
        <div
          className="space-y-3 rounded-2xl border border-portal-border bg-portal-surface-muted px-4 py-4"
          data-testid="execution-result-panel"
        >
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-portal-text-muted">
              Result
            </p>
            {lastResult.executionTimeMs != null ? (
              <span className="text-xs text-portal-text-muted">
                {lastResult.executionTimeMs} ms
              </span>
            ) : null}
          </div>

          {/* Compile output — text only */}
          <OutputPanel
            content={lastResult.compileOutput}
            label="Compile output"
            testId="compile-output"
          />

          {/* Stdout — text only */}
          <OutputPanel content={lastResult.stdout} label="stdout" testId="stdout-output" />

          {/* Stderr — text only */}
          <OutputPanel content={lastResult.stderr} label="stderr" testId="stderr-output" />

          {/* Per-public-test results */}
          {lastResult.testResults && lastResult.testResults.length > 0 ? (
            <div className="space-y-2" data-testid="test-results">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-portal-text-muted">
                Test results
              </p>
              {lastResult.testResults.map((tr, idx) => (
                <div
                  className={`rounded-xl border px-3 py-2 text-xs ${tr.passed ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}
                  key={idx}
                  data-testid={`test-result-${idx}`}
                >
                  <span
                    className={`font-semibold ${tr.passed ? 'text-emerald-700' : 'text-rose-700'}`}
                  >
                    {tr.passed ? '✓ Passed' : '✗ Failed'}
                  </span>
                  {tr.verdict !== 'ACCEPTED' ? (
                    <span className="ml-2 text-rose-600">
                      {tr.verdict.replaceAll('_', ' ').toLowerCase()}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Save answer */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          className="rounded-full border border-portal-border bg-white px-4 py-2 text-sm font-medium text-portal-text shadow-sm transition hover:bg-portal-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
          data-testid="attempt-save-answer-button"
          disabled={!canEdit || isSaving}
          onClick={() => void handleSave()}
          type="button"
        >
          {isSaving ? 'Saving…' : 'Save answer'}
        </button>

        {saveSucceeded ? (
          <p className="text-sm text-emerald-700" data-testid="attempt-save-success">
            Answer saved.
          </p>
        ) : null}
        {saveConflict ? (
          <p className="text-sm text-amber-700" data-testid="attempt-save-conflict">
            Server state changed. Refresh before continuing.
          </p>
        ) : null}
        {saveError ? (
          <p className="text-sm text-rose-700" data-testid="attempt-save-error">
            {saveError}
          </p>
        ) : null}
      </div>
    </div>
  );
}
