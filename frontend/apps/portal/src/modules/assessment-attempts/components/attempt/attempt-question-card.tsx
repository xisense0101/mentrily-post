'use client';

import { useEffect, useRef, useState } from 'react';
import {
  CodePlaceholderAnswer,
  FileUploadAnswer,
  LongAnswerInput,
  McqAnswerInput,
  MultiSelectAnswerInput,
  ReadingPassageDisplay,
  ShortAnswerInput,
  TrueFalseAnswerInput,
} from '../answers';
import type { AssessmentAttemptAnswerContract, AssessmentQuestionContract } from '../../types';
import { AttemptAnswerStatusBadge } from './attempt-answer-status-badge';
import {
  isPlaceholderQuestionKind,
  isQuestionAnswerable,
  isSupportedAttemptQuestionKind,
} from '../../state';

interface AttemptQuestionCardProps {
  assessmentId: string;
  attemptId: string;
  question: AssessmentQuestionContract;
  answer?: AssessmentAttemptAnswerContract | undefined;
  readOnly: boolean;
  isSaving: boolean;
  saveSucceeded?: boolean | undefined;
  saveConflict?: boolean | undefined;
  saveError?: string | undefined;
  onSave: (value: unknown) => Promise<void> | void;
}

interface AttemptOptionView {
  id: string;
  label: string;
  description?: string | undefined;
}

function readStringField(value: unknown, field: string): string | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  return typeof record[field] === 'string' ? (record[field] as string) : undefined;
}

function toOptionView(option: Record<string, unknown>, index: number): AttemptOptionView {
  return {
    id: readStringField(option, 'id') ?? `option-${index}`,
    label:
      readStringField(option, 'label') ?? readStringField(option, 'value') ?? `Option ${index + 1}`,
    description: readStringField(option, 'description'),
  };
}

function getPromptText(question: AssessmentQuestionContract): string {
  return readStringField(question.prompt, 'text') ?? question.title;
}

function stringifyAutosaveValue(value: unknown): string {
  if (value === undefined) {
    return 'undefined';
  }

  return JSON.stringify(value);
}

function getInitialValue(
  question: AssessmentQuestionContract,
  answer?: AssessmentAttemptAnswerContract,
): unknown {
  const payload = answer?.answer;

  switch (question.kind) {
    case 'MCQ':
      return readStringField(payload, 'selectedOptionId') ?? '';
    case 'MULTI_SELECT':
      return Array.isArray(payload?.selectedOptionIds)
        ? payload.selectedOptionIds.filter((item): item is string => typeof item === 'string')
        : [];
    case 'TRUE_FALSE':
      return typeof payload?.value === 'boolean' ? payload.value : null;
    case 'SHORT_ANSWER':
    case 'LONG_ANSWER':
      return readStringField(payload, 'text') ?? '';
    case 'CODE':
      return readStringField(payload, 'sourceCode') ?? '';
    case 'FILE_UPLOAD':
      return Array.isArray(payload?.mediaAssetIds)
        ? payload.mediaAssetIds.filter((item): item is string => typeof item === 'string')
        : [];
    default:
      return '';
  }
}

export function AttemptQuestionCard({
  assessmentId,
  attemptId,
  question,
  answer,
  readOnly,
  isSaving,
  saveSucceeded = false,
  saveConflict = false,
  saveError,
  onSave,
}: AttemptQuestionCardProps) {
  const initialValue = getInitialValue(question, answer);
  const [value, setValue] = useState<unknown>(initialValue);
  const autosaveValueRef = useRef<unknown>(value);
  const lastSavedValueRef = useRef<string>(stringifyAutosaveValue(initialValue));

  useEffect(() => {
    const nextInitialValue = getInitialValue(question, answer);
    setValue(nextInitialValue);
    lastSavedValueRef.current = stringifyAutosaveValue(nextInitialValue);
  }, [answer, question]);

  const options = question.options.map(toOptionView);
  const promptText = getPromptText(question);
  const supportedKind = isSupportedAttemptQuestionKind(question.kind);
  const answerable = supportedKind && isQuestionAnswerable(question.kind);
  const placeholder = supportedKind && isPlaceholderQuestionKind(question.kind);
  const promptRecord =
    typeof question.prompt === 'object' && question.prompt !== null
      ? (question.prompt as Record<string, unknown>)
      : {};

  useEffect(() => {
    autosaveValueRef.current = value;
  }, [value]);

  useEffect(() => {
    if (readOnly || placeholder || !answerable) {
      return undefined;
    }

    const serializedValue = stringifyAutosaveValue(value);
    if (serializedValue === lastSavedValueRef.current) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      lastSavedValueRef.current = serializedValue;
      void onSave(autosaveValueRef.current);
    }, 900);

    return () => window.clearTimeout(timeoutId);
  }, [answerable, onSave, placeholder, readOnly, value]);

  return (
    <article
      className="rounded-[1.75rem] border border-portal-border bg-white/90 p-6 shadow-portal-sm"
      data-question-id={question.id}
      data-testid="attempt-question-card"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-portal-text-muted">
            {question.kind.replaceAll('_', ' ')}
          </p>
          <h3 className="mt-2 text-xl font-semibold text-portal-text">{question.title}</h3>
          <p className="mt-2 text-sm leading-6 text-portal-text-muted">{promptText}</p>
          <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-portal-text-muted">
            {question.points} point{question.points === 1 ? '' : 's'}
          </p>
        </div>
        {answer ? <AttemptAnswerStatusBadge status={answer.status} /> : null}
      </div>

      <div className="mt-5">
        {question.kind === 'READING_PASSAGE' ? (
          <ReadingPassageDisplay
            body={readStringField(promptRecord, 'passageBody')}
            sourceLabel={readStringField(promptRecord, 'sourceLabel')}
            title={readStringField(promptRecord, 'passageTitle')}
          />
        ) : null}
        {question.kind === 'MCQ' ? (
          <McqAnswerInput
            disabled={readOnly}
            name={`question-${question.id}`}
            onChange={setValue}
            options={options}
            value={typeof value === 'string' ? value : ''}
          />
        ) : null}
        {question.kind === 'MULTI_SELECT' ? (
          <MultiSelectAnswerInput
            disabled={readOnly}
            onChange={setValue}
            options={options}
            value={
              Array.isArray(value)
                ? value.filter((item): item is string => typeof item === 'string')
                : []
            }
          />
        ) : null}
        {question.kind === 'TRUE_FALSE' ? (
          <TrueFalseAnswerInput
            disabled={readOnly}
            onChange={setValue}
            value={typeof value === 'boolean' ? value : null}
          />
        ) : null}
        {question.kind === 'SHORT_ANSWER' ? (
          <ShortAnswerInput
            disabled={readOnly}
            onChange={setValue}
            value={typeof value === 'string' ? value : ''}
          />
        ) : null}
        {question.kind === 'LONG_ANSWER' ? (
          <LongAnswerInput
            disabled={readOnly}
            onChange={setValue}
            value={typeof value === 'string' ? value : ''}
          />
        ) : null}
        {question.kind === 'CODE' ? (
          <CodePlaceholderAnswer
            disabled={readOnly}
            onChange={setValue}
            value={typeof value === 'string' ? value : ''}
          />
        ) : null}
        {question.kind === 'FILE_UPLOAD' ? (
          <FileUploadAnswer
            answerId={answer?.id}
            assessmentId={assessmentId}
            attemptId={attemptId}
            disabled={readOnly}
            onChange={setValue}
            question={question}
            submittedFiles={answer?.submittedFiles}
            value={
              Array.isArray(value)
                ? value.filter((item): item is string => typeof item === 'string')
                : []
            }
          />
        ) : null}
        {question.kind === 'NOTEBOOK' || question.kind === 'RUBRIC_ONLY' ? (
          <div
            className="rounded-2xl border border-dashed border-portal-border bg-portal-surface-muted px-4 py-4 text-sm text-portal-text-muted"
            data-testid="attempt-answer-input"
          >
            This question type is reserved in the runtime foundation and does not support
            interactive input yet.
          </div>
        ) : null}
        {!supportedKind ? (
          <div
            className="rounded-2xl border border-dashed border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700"
            data-testid="unsupported-question-fallback"
          >
            This question type is not supported in the learner runner yet. You can continue the
            attempt, but this item cannot be answered here.
          </div>
        ) : null}
      </div>

      {answerable ? (
        <div className="mt-5 space-y-3">
          <button
            className="rounded-full border border-portal-border bg-white px-4 py-2 text-sm font-medium text-portal-text shadow-sm transition hover:bg-portal-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
            data-testid="attempt-save-answer-button"
            disabled={readOnly || isSaving || placeholder}
            onClick={() => void onSave(value)}
            type="button"
          >
            {isSaving ? 'Saving...' : placeholder ? 'Uploads unavailable' : 'Save answer'}
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
      ) : null}
    </article>
  );
}
