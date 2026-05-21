'use client';

import { useId, useState } from 'react';
import { Button, Card, Input, Select, Textarea } from '@mentrily/ui-system';
import type { CreateLearningCourseRequest, LearningVisibility } from '../../types';

interface CourseCreateFormProps {
  onSubmit: (input: CreateLearningCourseRequest) => Promise<void> | void;
  isPending?: boolean;
  errorMessage?: string | null;
}

export function CourseCreateForm({
  onSubmit,
  isPending = false,
  errorMessage,
}: CourseCreateFormProps) {
  const titleId = useId();
  const slugId = useId();
  const descriptionId = useId();
  const visibilityId = useId();
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<LearningVisibility>('WORKSPACE');
  const [validationError, setValidationError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) {
      setValidationError('Title is required.');
      return;
    }

    if (!slug.trim()) {
      setValidationError('Slug is required.');
      return;
    }

    setValidationError(null);
    await onSubmit({
      title: title.trim(),
      slug: slug.trim(),
      ...(description.trim() ? { description: description.trim() } : {}),
      visibility,
    });
    setTitle('');
    setSlug('');
    setDescription('');
    setVisibility('WORKSPACE');
  }

  return (
    <div data-testid="course-create-form">
      <Card>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Create a draft course</h2>
          <p className="mt-1 text-sm text-slate-600">
            Start with a basic draft, then add sections, lessons, and publishing details.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2" data-testid="course-title-input">
            <label className="text-sm font-medium text-slate-700" htmlFor={titleId}>
              Title
            </label>
            <Input
              id={titleId}
              name="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Operational Readiness 101"
            />
          </div>

          <div className="space-y-2" data-testid="course-slug-input">
            <label className="text-sm font-medium text-slate-700" htmlFor={slugId}>
              Slug
            </label>
            <Input
              id={slugId}
              name="slug"
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              placeholder="operational-readiness-101"
            />
          </div>

          <div className="space-y-2" data-testid="course-visibility-select">
            <label className="text-sm font-medium text-slate-700" htmlFor={visibilityId}>
              Visibility
            </label>
            <Select
              id={visibilityId}
              name="visibility"
              value={visibility}
              onChange={(event) =>
                setVisibility(event.target.value as LearningVisibility)
              }
            >
              <option value="PRIVATE">Private</option>
              <option value="WORKSPACE">Workspace</option>
              <option value="PUBLIC">Public</option>
              <option value="UNLISTED">Unlisted</option>
            </Select>
          </div>

          <div className="space-y-2" data-testid="course-description-input">
            <label className="text-sm font-medium text-slate-700" htmlFor={descriptionId}>
              Description
            </label>
            <Textarea
              id={descriptionId}
              name="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Outline what learners should take away from this course."
            />
          </div>

          {validationError || errorMessage ? (
            <p className="text-sm text-rose-600">{validationError ?? errorMessage}</p>
          ) : null}

          <div data-testid="course-create-submit">
            <Button disabled={isPending} type="submit">
              {isPending ? 'Creating course...' : 'Create draft'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
