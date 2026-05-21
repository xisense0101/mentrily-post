'use client';

import { useId, useState } from 'react';
import { Button, Card, Input } from '@mentrily/ui-system';
import type { AddLearningSectionRequest } from '../../types';

interface SectionCreateFormProps {
  onSubmit: (input: AddLearningSectionRequest) => Promise<void> | void;
  isPending?: boolean;
}

export function SectionCreateForm({
  onSubmit,
  isPending = false,
}: SectionCreateFormProps) {
  const titleId = useId();
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) {
      setError('Section title is required.');
      return;
    }

    setError(null);
    await onSubmit({ title: title.trim() });
    setTitle('');
  }

  return (
    <div data-testid="section-create-form">
      <Card>
        <h3 className="text-lg font-semibold text-slate-900">Add a section</h3>
        <form className="mt-4 flex flex-col gap-3 md:flex-row" onSubmit={handleSubmit}>
          <div className="flex-1 space-y-2" data-testid="section-title-input">
          <label className="text-sm font-medium text-slate-700" htmlFor={titleId}>
            Section title
          </label>
          <Input
            id={titleId}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Introduction"
          />
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          </div>
          <div className="md:self-end" data-testid="section-create-submit">
            <Button disabled={isPending} type="submit">
              {isPending ? 'Adding...' : 'Add section'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
