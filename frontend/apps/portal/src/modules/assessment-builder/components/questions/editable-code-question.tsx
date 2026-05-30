'use client';

import { useState } from 'react';
import type {
  AssessmentQuestionContract,
  CodingAuthoringTestCase,
  CodingQuestionAuthoringConfigContract,
} from '../../types';
import { QuestionShell } from './question-shell';
import { Button, Input, Textarea } from '@mentrily/ui-system';
import { AnswerKeyEditor } from './answer-key-editor';

interface EditableCodeQuestionProps {
  question: AssessmentQuestionContract;
  onUpdate?: ((patch: Partial<AssessmentQuestionContract>) => void) | undefined;
  onRemove?: (() => void) | undefined;
  readonly?: boolean | undefined;
}

export function EditableCodeQuestion({
  question,
  onUpdate,
  onRemove,
  readonly,
}: EditableCodeQuestionProps) {
  if (question.gradingMode !== 'AUTO') {
    return (
      <QuestionShell
        onRemove={onRemove}
        onUpdate={onUpdate}
        question={question}
        readonly={readonly}
      >
        <AnswerKeyEditor
          answerKey={question.answerKey}
          disabled={readonly}
          kind="CODE"
          onChange={(answerKey) => onUpdate?.({ answerKey })}
        />
      </QuestionShell>
    );
  }

  const config: CodingQuestionAuthoringConfigContract = question.answerKey?.codingConfig ?? {
    allowedLanguages: ['javascript'],
    starterCodeByLanguage: {
      javascript: '// Enter starter code here\n',
    },
    publicSampleTestCases: [],
    publicGradedTestCases: [],
    hiddenGradedTestCases: [],
  };

  const allowedLanguages = Array.isArray(config.allowedLanguages) ? config.allowedLanguages : [];
  const starterCodeByLanguage =
    typeof config.starterCodeByLanguage === 'object' && config.starterCodeByLanguage !== null
      ? config.starterCodeByLanguage
      : {};
  const publicSampleTestCases = Array.isArray(config.publicSampleTestCases)
    ? config.publicSampleTestCases
    : [];
  const publicGradedTestCases = Array.isArray(config.publicGradedTestCases)
    ? config.publicGradedTestCases
    : [];
  const hiddenGradedTestCases = Array.isArray(config.hiddenGradedTestCases)
    ? config.hiddenGradedTestCases
    : [];

  const [activeLangTab, setActiveLangTab] = useState<string>('javascript');
  const [activeTestCaseTab, setActiveTestCaseTab] = useState<
    'sample' | 'public_graded' | 'hidden_graded'
  >('sample');

  const languages = ['javascript', 'python', 'cpp', 'java'];
  const totalTests =
    publicSampleTestCases.length + publicGradedTestCases.length + hiddenGradedTestCases.length;

  const updateConfig = (patch: Partial<CodingQuestionAuthoringConfigContract>) => {
    if (readonly) return;
    const nextConfig = {
      allowedLanguages,
      starterCodeByLanguage,
      publicSampleTestCases,
      publicGradedTestCases,
      hiddenGradedTestCases,
      ...patch,
    };
    onUpdate?.({
      answerKey: {
        ...(question.answerKey ?? {}),
        codingConfig: nextConfig,
      },
    });
  };

  const handleLanguageToggle = (lang: string) => {
    let nextLangs = [...allowedLanguages];
    const nextStarter = { ...starterCodeByLanguage };
    if (nextLangs.includes(lang)) {
      nextLangs = nextLangs.filter((l) => l !== lang);
    } else {
      nextLangs.push(lang);
      if (!nextStarter[lang]) {
        nextStarter[lang] =
          lang === 'python' ? `# Enter python code here\n` : `// Enter ${lang} code here\n`;
      }
    }
    updateConfig({
      allowedLanguages: nextLangs,
      starterCodeByLanguage: nextStarter,
    });
  };

  const handleStarterCodeChange = (code: string) => {
    const active = allowedLanguages.includes(activeLangTab)
      ? activeLangTab
      : allowedLanguages[0] || 'javascript';
    updateConfig({
      starterCodeByLanguage: {
        ...starterCodeByLanguage,
        [active]: code,
      },
    });
  };

  const handleTestCaseChange = (
    category: 'sample' | 'public_graded' | 'hidden_graded',
    index: number,
    field: keyof CodingAuthoringTestCase,
    value: string | number,
  ) => {
    const listKey =
      category === 'sample'
        ? 'publicSampleTestCases'
        : category === 'public_graded'
          ? 'publicGradedTestCases'
          : 'hiddenGradedTestCases';
    const list = [
      ...(category === 'sample'
        ? publicSampleTestCases
        : category === 'public_graded'
          ? publicGradedTestCases
          : hiddenGradedTestCases),
    ];
    if (list[index]) {
      list[index] = {
        ...list[index],
        [field]: value,
      };
      updateConfig({ [listKey]: list });
    }
  };

  const handleAddTestCase = (category: 'sample' | 'public_graded' | 'hidden_graded') => {
    const listKey =
      category === 'sample'
        ? 'publicSampleTestCases'
        : category === 'public_graded'
          ? 'publicGradedTestCases'
          : 'hiddenGradedTestCases';
    const list = [
      ...(category === 'sample'
        ? publicSampleTestCases
        : category === 'public_graded'
          ? publicGradedTestCases
          : hiddenGradedTestCases),
    ];
    const newTest: CodingAuthoringTestCase = {
      id: `${category}-test-${Date.now()}`,
      input: '',
      expectedOutput: '',
      ...(category !== 'sample' ? { weight: 1 } : {}),
    };
    updateConfig({ [listKey]: [...list, newTest] });
  };

  const handleRemoveTestCase = (
    category: 'sample' | 'public_graded' | 'hidden_graded',
    index: number,
  ) => {
    const listKey =
      category === 'sample'
        ? 'publicSampleTestCases'
        : category === 'public_graded'
          ? 'publicGradedTestCases'
          : 'hiddenGradedTestCases';
    const list = [
      ...(category === 'sample'
        ? publicSampleTestCases
        : category === 'public_graded'
          ? publicGradedTestCases
          : hiddenGradedTestCases),
    ];
    updateConfig({
      [listKey]: list.filter((_, i) => i !== index),
    });
  };

  const handleMoveTestCase = (
    category: 'sample' | 'public_graded' | 'hidden_graded',
    index: number,
    direction: 'up' | 'down',
  ) => {
    const listKey =
      category === 'sample'
        ? 'publicSampleTestCases'
        : category === 'public_graded'
          ? 'publicGradedTestCases'
          : 'hiddenGradedTestCases';
    const list = [
      ...(category === 'sample'
        ? publicSampleTestCases
        : category === 'public_graded'
          ? publicGradedTestCases
          : hiddenGradedTestCases),
    ];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < list.length) {
      const temp = list[index];
      const target = list[targetIndex];
      if (temp && target) {
        list[index] = target;
        list[targetIndex] = temp;
        updateConfig({ [listKey]: list });
      }
    }
  };

  const activeTestCaseList =
    activeTestCaseTab === 'sample'
      ? publicSampleTestCases
      : activeTestCaseTab === 'public_graded'
        ? publicGradedTestCases
        : hiddenGradedTestCases;

  // Validation Warnings
  const validationErrors: string[] = [];
  if (allowedLanguages.length === 0) {
    validationErrors.push('Select at least one allowed language.');
  }
  if (allowedLanguages.length > 4) {
    validationErrors.push('Maximum 4 allowed languages allowed.');
  }

  // Duplicate ID check
  const allIds = [...publicSampleTestCases, ...publicGradedTestCases, ...hiddenGradedTestCases].map(
    (t) => t.id,
  );
  const duplicates = allIds.filter((item, index) => allIds.indexOf(item) !== index);
  if (duplicates.length > 0) {
    validationErrors.push(`Duplicate test case IDs: ${Array.from(new Set(duplicates)).join(', ')}`);
  }

  if (totalTests > 50) {
    validationErrors.push('Total test cases cannot exceed 50.');
  }
  if (publicSampleTestCases.length > 10) {
    validationErrors.push('Public sample test cases cannot exceed 10.');
  }
  if (publicGradedTestCases.length > 20) {
    validationErrors.push('Public graded test cases cannot exceed 20.');
  }
  if (hiddenGradedTestCases.length > 20) {
    validationErrors.push('Hidden graded test cases cannot exceed 20.');
  }

  // Starter code size
  let totalStarterSize = 0;
  for (const code of Object.values(starterCodeByLanguage)) {
    if (typeof code === 'string') {
      totalStarterSize += code.length;
    }
  }
  if (totalStarterSize > 51200) {
    validationErrors.push('Starter code size exceeds 50 KB limit.');
  }

  // Negative weights or weight > 1000
  const hasInvalidWeight = [...publicGradedTestCases, ...hiddenGradedTestCases].some(
    (tc) => typeof tc.weight === 'number' && (tc.weight < 0 || tc.weight > 1000),
  );
  if (hasInvalidWeight) {
    validationErrors.push('Test case weights must be between 0 and 1000.');
  }

  // Auto-graded must have at least one graded test case
  if (
    question.gradingMode === 'AUTO' &&
    publicGradedTestCases.length === 0 &&
    hiddenGradedTestCases.length === 0
  ) {
    validationErrors.push(
      'Auto-graded questions require at least one graded test case (public or hidden).',
    );
  }

  return (
    <QuestionShell onRemove={onRemove} onUpdate={onUpdate} question={question} readonly={readonly}>
      <div className="space-y-4" data-testid="editable-code-question">
        {/* Allowed Languages */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-700">Allowed Languages</label>
          <div className="flex flex-wrap gap-2">
            {languages.map((lang) => {
              const isSelected = allowedLanguages.includes(lang);
              return (
                <button
                  key={lang}
                  type="button"
                  disabled={readonly}
                  onClick={() => handleLanguageToggle(lang)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
                    isSelected
                      ? 'bg-slate-900 border-slate-950 text-white shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                  data-testid={`allowed-language-${lang}`}
                >
                  {lang === 'cpp' ? 'C++' : lang.charAt(0).toUpperCase() + lang.slice(1)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Starter Code */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-700">Starter Code Template</label>
          {allowedLanguages.length === 0 ? (
            <div className="text-xs text-slate-400 py-6 bg-slate-50 rounded-2xl text-center border border-dashed border-slate-200">
              Please select at least one allowed language to customize starter code.
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex border-b border-slate-100 gap-1 overflow-x-auto pb-0.5">
                {allowedLanguages.map((lang: string) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setActiveLangTab(lang)}
                    className={`px-3 py-1.5 text-xs font-medium border-b-2 whitespace-nowrap transition ${
                      activeLangTab === lang
                        ? 'border-slate-800 text-slate-800 font-semibold'
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                    data-testid={`starter-code-tab-${lang}`}
                  >
                    {lang === 'cpp' ? 'C++' : lang.charAt(0).toUpperCase() + lang.slice(1)}
                  </button>
                ))}
              </div>
              <Textarea
                disabled={readonly}
                value={
                  starterCodeByLanguage[
                    allowedLanguages.includes(activeLangTab)
                      ? activeLangTab
                      : allowedLanguages[0] || 'javascript'
                  ] ?? ''
                }
                onChange={(e) => handleStarterCodeChange(e.target.value)}
                placeholder={`Write starter code for ${activeLangTab}...`}
                className="font-mono text-xs bg-slate-50 border-slate-200 focus:bg-white"
                rows={6}
                data-testid="starter-code-textarea"
              />
            </div>
          )}
        </div>

        {/* Test Cases tab selector */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <label className="text-xs font-semibold text-slate-700">Test Cases</label>
            <span className="text-[10px] font-medium text-slate-500">
              Total count:{' '}
              <span
                className={
                  totalTests > 50 ? 'text-rose-600 font-bold' : 'text-slate-700 font-semibold'
                }
              >
                {totalTests} / 50
              </span>
            </span>
          </div>

          <div className="flex border-b border-slate-100 gap-1 overflow-x-auto pb-0.5">
            {(['sample', 'public_graded', 'hidden_graded'] as const).map((tab) => {
              const label =
                tab === 'sample'
                  ? 'Public Samples'
                  : tab === 'public_graded'
                    ? 'Public Graded'
                    : 'Hidden Graded';
              const count =
                tab === 'sample'
                  ? publicSampleTestCases.length
                  : tab === 'public_graded'
                    ? publicGradedTestCases.length
                    : hiddenGradedTestCases.length;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTestCaseTab(tab)}
                  className={`px-3 py-1.5 text-xs font-medium border-b-2 whitespace-nowrap transition ${
                    activeTestCaseTab === tab
                      ? 'border-slate-800 text-slate-800 font-semibold'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                  data-testid={`test-case-tab-${tab}`}
                >
                  {label} ({count})
                </button>
              );
            })}
          </div>

          <div className="space-y-3">
            {activeTestCaseList.map((tc: CodingAuthoringTestCase, idx: number) => (
              <div
                key={tc.id}
                className="p-4 border border-slate-200 rounded-2xl bg-white shadow-sm flex flex-col gap-3 relative transition hover:border-slate-300"
                data-testid="test-case-card"
              >
                <div className="flex items-center justify-between gap-2 border-b border-slate-50 pb-2">
                  <span className="text-[11px] font-semibold text-slate-500">
                    Test Case #{idx + 1}
                  </span>
                  {!readonly && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveTestCase(activeTestCaseTab, idx, 'up')}
                        className="px-2 py-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 text-xs font-semibold"
                        title="Move Up"
                        data-testid={`move-up-${idx}`}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        disabled={idx === activeTestCaseList.length - 1}
                        onClick={() => handleMoveTestCase(activeTestCaseTab, idx, 'down')}
                        className="px-2 py-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 text-xs font-semibold"
                        title="Move Down"
                        data-testid={`move-down-${idx}`}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveTestCase(activeTestCaseTab, idx)}
                        className="px-2 py-0.5 text-slate-400 hover:text-rose-600 text-xs font-semibold ml-1"
                        title="Delete"
                        data-testid={`delete-test-case-${idx}`}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium text-slate-500">Test Case ID</label>
                    <Input
                      disabled={readonly}
                      value={tc.id}
                      onChange={(e) =>
                        handleTestCaseChange(activeTestCaseTab, idx, 'id', e.target.value)
                      }
                      placeholder="e.g. test-1"
                      className="text-xs"
                      data-testid={`test-case-id-input-${idx}`}
                    />
                  </div>
                  {activeTestCaseTab !== 'sample' ? (
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-slate-500">Weight</label>
                      <Input
                        disabled={readonly}
                        type="number"
                        value={String(tc.weight ?? 1)}
                        onChange={(e) =>
                          handleTestCaseChange(
                            activeTestCaseTab,
                            idx,
                            'weight',
                            parseInt(e.target.value) || 0,
                          )
                        }
                        placeholder="1"
                        className="text-xs"
                        data-testid={`test-case-weight-input-${idx}`}
                      />
                    </div>
                  ) : (
                    <div className="flex items-end text-[10px] text-slate-400 pb-2">
                      Practice only, no grading weight.
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium text-slate-500">Input (stdin)</label>
                    <Textarea
                      disabled={readonly}
                      value={tc.input}
                      onChange={(e) =>
                        handleTestCaseChange(activeTestCaseTab, idx, 'input', e.target.value)
                      }
                      placeholder="Test arguments or stdin..."
                      rows={2}
                      className="font-mono text-xs bg-slate-50"
                      data-testid={`test-case-input-input-${idx}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium text-slate-500">
                      Expected Output (stdout)
                    </label>
                    <Textarea
                      disabled={readonly}
                      value={tc.expectedOutput}
                      onChange={(e) =>
                        handleTestCaseChange(
                          activeTestCaseTab,
                          idx,
                          'expectedOutput',
                          e.target.value,
                        )
                      }
                      placeholder="Expected output..."
                      rows={2}
                      className="font-mono text-xs bg-slate-50"
                      data-testid={`test-case-output-input-${idx}`}
                    />
                  </div>
                </div>
              </div>
            ))}

            {activeTestCaseList.length === 0 && (
              <div className="py-8 bg-slate-50 rounded-2xl text-center text-xs text-slate-400 border border-dashed border-slate-200">
                No test cases added. Click below to add a new test case.
              </div>
            )}

            {!readonly && (
              <Button
                onClick={() => handleAddTestCase(activeTestCaseTab)}
                variant="secondary"
                className="w-full text-xs font-semibold py-2"
                data-testid="add-test-case-button"
              >
                + Add Test Case
              </Button>
            )}
          </div>
        </div>

        {/* Validation Errors list */}
        {validationErrors.length > 0 && (
          <div
            className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs space-y-1 shadow-sm mt-4"
            data-testid="validation-warnings"
          >
            <p className="font-semibold text-rose-800">Validation warnings:</p>
            <ul className="list-disc list-inside space-y-0.5">
              {validationErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </QuestionShell>
  );
}
