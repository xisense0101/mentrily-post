'use client';

import { Button, Card, Input, Textarea } from '@mentrily/ui-system';
import { useId, useState } from 'react';

interface AssessmentSectionCreateFormProps {
  onSubmit: (input: { title: string; description?: string | undefined }) => void;
  disabled?: boolean | undefined;
}

export function AssessmentSectionCreateForm({
  onSubmit,
  disabled,
}: AssessmentSectionCreateFormProps) {
  const titleId = useId();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) {
      setError('Section title is required.');
      return;
    }

    setError(null);
    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
    });
    setTitle('');
    setDescription('');
  }

  return (
    <div data-testid="assessment-section-create-form">
      <Card className="rounded-[1.5rem]" data-testid="section-create-form">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Add a section</h3>
        <form className="space-y-3" onSubmit={handleSubmit}>
          <div className="space-y-1" data-testid="assessment-section-title-input">
            <label className="text-xs font-medium text-slate-600" htmlFor={titleId}>
              Section title
            </label>
            <Input
              disabled={disabled}
              id={titleId}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Section 1: Introduction"
              value={title}
            />
          </div>
          <Textarea
            disabled={disabled}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Optional description..."
            rows={2}
            value={description}
          />
          {error ? <p className="text-xs text-rose-600">{error}</p> : null}
          <div data-testid="assessment-add-section-button">
            <Button disabled={disabled} type="submit" variant="secondary">
              Add section
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
