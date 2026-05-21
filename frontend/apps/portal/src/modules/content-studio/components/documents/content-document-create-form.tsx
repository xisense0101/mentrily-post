'use client';

import { useId, useState } from 'react';
import { Button, Card, Input, Select } from '@mentrily/ui-system';
import type { ContentDocumentPurposeContract, CreateContentDocumentRequest } from '../../types';

interface ContentDocumentCreateFormProps {
  onSubmit: (input: CreateContentDocumentRequest) => Promise<void> | void;
  isPending?: boolean;
  errorMessage?: string | null;
}

export function ContentDocumentCreateForm({
  onSubmit,
  isPending = false,
  errorMessage,
}: ContentDocumentCreateFormProps) {
  const titleId = useId();
  const purposeId = useId();
  const [title, setTitle] = useState('');
  const [purpose, setPurpose] = useState<ContentDocumentPurposeContract>('GENERAL_PAGE');
  const [validationError, setValidationError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) {
      setValidationError('Title is required.');
      return;
    }

    setValidationError(null);
    await onSubmit({
      title: title.trim(),
      purpose,
    });
    setTitle('');
    setPurpose('GENERAL_PAGE');
  }

  return (
    <div data-testid="content-document-create-form">
      <Card className="rounded-[2rem]">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Create a draft document</h2>
          <p className="mt-1 text-sm text-slate-600">
            Start a reusable content draft for courses, lessons, or general pages.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2" data-testid="content-document-title-input">
            <label className="text-sm font-medium text-slate-700" htmlFor={titleId}>
              Title
            </label>
            <Input
              id={titleId}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Creator onboarding overview"
            />
          </div>

          <div className="space-y-2" data-testid="content-document-purpose-select">
            <label className="text-sm font-medium text-slate-700" htmlFor={purposeId}>
              Purpose
            </label>
            <Select
              id={purposeId}
              value={purpose}
              onChange={(event) => setPurpose(event.target.value as ContentDocumentPurposeContract)}
            >
              <option value="GENERAL_PAGE">General page</option>
              <option value="COURSE_CONTENT">Course content</option>
              <option value="LESSON_CONTENT">Lesson content</option>
              <option value="ASSESSMENT_CONTENT_RESERVED">Assessment reserved</option>
              <option value="QUESTION_CONTENT_RESERVED">Question reserved</option>
            </Select>
          </div>

          {validationError || errorMessage ? (
            <p className="text-sm text-rose-600">{validationError ?? errorMessage}</p>
          ) : null}

          <div data-testid="content-document-create-submit">
            <Button disabled={isPending} type="submit">
              {isPending ? 'Creating document...' : 'Create draft'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
