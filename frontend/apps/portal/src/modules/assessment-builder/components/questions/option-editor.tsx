'use client';

import { Button, Input } from '@mentrily/ui-system';

interface Option {
  id: string;
  label: string;
  value: string;
  isCorrect: boolean;
}

interface OptionEditorProps {
  options: Option[];
  multipleCorrect?: boolean | undefined;
  onChange: (options: Option[]) => void;
  disabled?: boolean | undefined;
}

export function OptionEditor({
  options,
  multipleCorrect = false,
  onChange,
  disabled,
}: OptionEditorProps) {
  function handleLabelChange(index: number, label: string) {
    const next = options.map((opt, i) => (i === index ? { ...opt, label } : opt));
    onChange(next);
  }

  function handleToggleCorrect(index: number) {
    const next = options.map((opt, i) => {
      if (i !== index) {
        // For single-correct, deselect all others; for multi-select, keep them
        return multipleCorrect ? opt : { ...opt, isCorrect: false };
      }

      return { ...opt, isCorrect: !opt.isCorrect };
    });

    onChange(next);
  }

  function handleAddOption() {
    const newOption: Option = {
      id: `option-${Date.now()}`,
      label: `Option ${String.fromCharCode(65 + options.length)}`,
      value: `option_${options.length}`,
      isCorrect: false,
    };

    onChange([...options, newOption]);
  }

  function handleRemoveOption(index: number) {
    onChange(options.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2" data-testid="option-editor">
      {options.map((option, index) => (
        <div
          className="flex items-center gap-2"
          key={option.id}
          data-testid="assessment-option-editor"
        >
          <input
            aria-label={`Mark option ${index + 1} as correct`}
            checked={option.isCorrect}
            className="h-4 w-4 cursor-pointer accent-slate-800"
            disabled={disabled}
            onChange={() => handleToggleCorrect(index)}
            type={multipleCorrect ? 'checkbox' : 'radio'}
            data-testid="assessment-option-correct-control"
          />
          <Input
            aria-label={`Option ${index + 1} label`}
            disabled={disabled}
            onChange={(event) => handleLabelChange(index, event.target.value)}
            placeholder={`Option ${String.fromCharCode(65 + index)}`}
            value={option.label}
            data-testid="assessment-option-label-input"
          />
          {options.length > 2 ? (
            <button
              aria-label={`Remove option ${index + 1}`}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
              disabled={disabled}
              onClick={() => handleRemoveOption(index)}
              type="button"
            >
              ×
            </button>
          ) : null}
        </div>
      ))}

      {!disabled ? (
        <Button onClick={handleAddOption} type="button" variant="ghost">
          + Add option
        </Button>
      ) : null}
    </div>
  );
}
