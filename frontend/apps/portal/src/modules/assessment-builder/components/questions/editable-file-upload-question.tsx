import { Input } from '@mentrily/ui-system';
import type { AssessmentQuestionContract } from '../../types';
import { QuestionShell } from './question-shell';

const FILE_CATEGORIES = ['document', 'image', 'video', 'audio', 'archive', 'other'] as const;

interface EditableFileUploadQuestionProps {
  question: AssessmentQuestionContract;
  onUpdate?: ((patch: Partial<AssessmentQuestionContract>) => void) | undefined;
  onRemove?: (() => void) | undefined;
  readonly?: boolean | undefined;
}

function readMetadataArray(value: unknown, key: string): string[] {
  if (typeof value !== 'object' || value === null) {
    return [];
  }

  const record = value as Record<string, unknown>;
  const entry = record[key];
  return Array.isArray(entry)
    ? entry.filter((item): item is string => typeof item === 'string')
    : [];
}

function readMetadataNumber(value: unknown, key: string): string {
  if (typeof value !== 'object' || value === null) {
    return '';
  }

  const record = value as Record<string, unknown>;
  const entry = record[key];
  return typeof entry === 'number' ? String(entry) : '';
}

export function EditableFileUploadQuestion({
  question,
  onUpdate,
  onRemove,
  readonly,
}: EditableFileUploadQuestionProps) {
  const allowedCategories = readMetadataArray(question.metadata, 'allowedFileCategories');
  const maxFiles = readMetadataNumber(question.metadata, 'maxFiles');
  const maxFileSizeMb = readMetadataNumber(question.metadata, 'maxFileSizeMb');

  return (
    <QuestionShell onRemove={onRemove} onUpdate={onUpdate} question={question} readonly={readonly}>
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <p className="font-semibold">File upload placeholder only</p>
        <p className="mt-1 text-amber-800">
          Real uploads are deferred to the future Media Library task. This question stores metadata
          only and does not open an upload widget or call storage services.
        </p>
      </div>

      <div className="space-y-3">
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-600">Allowed file categories</p>
          <div className="flex flex-wrap gap-2">
            {FILE_CATEGORIES.map((category) => {
              const checked = allowedCategories.includes(category);
              return (
                <label
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                  key={category}
                >
                  <input
                    checked={checked}
                    disabled={readonly}
                    onChange={(event) => {
                      const nextCategories = event.target.checked
                        ? [...allowedCategories, category]
                        : allowedCategories.filter((item) => item !== category);

                      onUpdate?.({
                        metadata: {
                          ...question.metadata,
                          allowedFileCategories: nextCategories,
                          placeholderOnly: true,
                        },
                        gradingMode: 'MANUAL',
                      });
                    }}
                    type="checkbox"
                  />
                  {category}
                </label>
              );
            })}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Max files</label>
            <Input
              disabled={readonly}
              inputMode="numeric"
              onChange={(event) =>
                onUpdate?.({
                  metadata: {
                    ...question.metadata,
                    maxFiles:
                      event.target.value.trim().length > 0 ? Number(event.target.value) : undefined,
                    placeholderOnly: true,
                  },
                  gradingMode: 'MANUAL',
                })
              }
              placeholder="e.g. 3"
              value={maxFiles}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Max file size (MB)</label>
            <Input
              disabled={readonly}
              inputMode="numeric"
              onChange={(event) =>
                onUpdate?.({
                  metadata: {
                    ...question.metadata,
                    maxFileSizeMb:
                      event.target.value.trim().length > 0 ? Number(event.target.value) : undefined,
                    placeholderOnly: true,
                  },
                  gradingMode: 'MANUAL',
                })
              }
              placeholder="e.g. 25"
              value={maxFileSizeMb}
            />
          </div>
        </div>
      </div>
    </QuestionShell>
  );
}
