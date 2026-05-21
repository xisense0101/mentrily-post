'use client';

import { useId, useState } from 'react';
import { Button, Card, Input, Select, Textarea } from '@mentrily/ui-system';
import type {
  AssessmentPurposeContract,
  AssessmentVisibilityContract,
  CreateAssessmentRequest,
} from '../../types';

interface AssessmentCreateFormProps {
  onSubmit: (input: CreateAssessmentRequest) => Promise<void> | void;
  isPending?: boolean | undefined;
  errorMessage?: string | null | undefined;
}

export function AssessmentCreateForm({
  onSubmit,
  isPending = false,
  errorMessage,
}: AssessmentCreateFormProps) {
  const titleId = useId();
  const purposeId = useId();
  const visibilityId = useId();
  const descriptionId = useId();
  const [title, setTitle] = useState('');
  const [purpose, setPurpose] = useState<AssessmentPurposeContract>('QUIZ');
  const [visibility, setVisibility] = useState<AssessmentVisibilityContract>('PRIVATE');
  const [description, setDescription] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) {
      setValidationError('Title is required.');
      return;
    }

    setValidationError(null);
    const request: CreateAssessmentRequest = {
      title: title.trim(),
      purpose,
      visibility,
    };

    if (description.trim()) {
      request.description = description.trim();
    }

    await onSubmit(request);
    setTitle('');
    setDescription('');
    setPurpose('QUIZ');
    setVisibility('PRIVATE');
  }

  return (
    <div data-testid="assessment-create-form">
      <Card className="rounded-[2rem]">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Create a draft assessment</h2>
          <p className="mt-1 text-sm text-slate-600">
            Start an exam, quiz, or assignment authoring shell.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2" data-testid="assessment-title-input">
            <label className="text-sm font-medium text-slate-700" htmlFor={titleId}>
              Title
            </label>
            <Input
              id={titleId}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Midterm Exam 2026"
              value={title}
            />
          </div>

          <div className="space-y-2" data-testid="assessment-purpose-select">
            <label className="text-sm font-medium text-slate-700" htmlFor={purposeId}>
              Purpose
            </label>
            <Select
              id={purposeId}
              onChange={(event) => setPurpose(event.target.value as AssessmentPurposeContract)}
              value={purpose}
            >
              <option value="QUIZ">Quiz</option>
              <option value="EXAM">Exam</option>
              <option value="PRACTICE">Practice</option>
              <option value="ASSIGNMENT">Assignment</option>
              <option value="PLACEMENT_TEST">Placement test</option>
              <option value="CERTIFICATION">Certification</option>
            </Select>
          </div>

          <div className="space-y-2" data-testid="assessment-visibility-select">
            <label className="text-sm font-medium text-slate-700" htmlFor={visibilityId}>
              Visibility
            </label>
            <Select
              id={visibilityId}
              onChange={(event) =>
                setVisibility(event.target.value as AssessmentVisibilityContract)
              }
              value={visibility}
            >
              <option value="PRIVATE">Private</option>
              <option value="WORKSPACE">Workspace</option>
              <option value="PUBLIC_LINK">Public link</option>
              <option value="INVITE_ONLY">Invite only</option>
            </Select>
          </div>

          <div className="space-y-2" data-testid="assessment-description-input">
            <label className="text-sm font-medium text-slate-700" htmlFor={descriptionId}>
              Description (optional)
            </label>
            <Textarea
              id={descriptionId}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe this assessment..."
              rows={3}
              value={description}
            />
          </div>

          {(validationError ?? errorMessage) ? (
            <p className="text-sm text-rose-600">{validationError ?? errorMessage}</p>
          ) : null}

          <div data-testid="assessment-create-submit">
            <Button disabled={isPending} type="submit">
              {isPending ? 'Creating assessment...' : 'Create draft'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
