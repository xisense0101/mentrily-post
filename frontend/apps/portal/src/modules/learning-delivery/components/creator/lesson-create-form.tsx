'use client';

import { useId, useState } from 'react';
import { Button, Card, Input, Select } from '@mentrily/ui-system';
import type {
  AddLearningLessonRequest,
  LearningContentKind,
} from '../../types';

import { AssetPickerDialog, useMediaAssets } from '@/modules/media-library';

interface LessonCreateFormProps {
  onSubmit: (input: AddLearningLessonRequest) => Promise<void> | void;
  isPending?: boolean;
  disabled?: boolean;
}

export function LessonCreateForm({
  onSubmit,
  isPending = false,
  disabled = false,
}: LessonCreateFormProps) {
  const titleId = useId();
  const kindId = useId();
  const minutesId = useId();
  const refId = useId();
  const requiredId = useId();
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<LearningContentKind>('TEXT');
  const [estimatedMinutes, setEstimatedMinutes] = useState('');
  const [contentRef, setContentRef] = useState('');
  const [isRequired, setIsRequired] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const { assets } = useMediaAssets({ status: 'AVAILABLE' });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) {
      setError('Lesson title is required.');
      return;
    }

    setError(null);
    const minutes = estimatedMinutes.trim()
      ? Number(estimatedMinutes)
      : undefined;

    await onSubmit({
      title: title.trim(),
      kind,
      ...(typeof minutes === 'number' && !Number.isNaN(minutes)
        ? { estimatedMinutes: minutes }
        : {}),
      ...(contentRef.trim() ? { contentRef: contentRef.trim() } : {}),
      isRequired,
    });

    setTitle('');
    setKind('TEXT');
    setEstimatedMinutes('');
    setContentRef('');
    setIsRequired(true);
  }

  return (
    <div data-testid="lesson-create-form">
      <Card>
        <h3 className="text-lg font-semibold text-slate-900">Add a lesson</h3>
        <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <div className="space-y-2 md:col-span-2" data-testid="lesson-title-input">
            <label className="text-sm font-medium text-slate-700" htmlFor={titleId}>
              Lesson title
            </label>
            <Input
              disabled={disabled}
              id={titleId}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Welcome and objectives"
            />
          </div>

          <div className="space-y-2" data-testid="lesson-kind-select">
            <label className="text-sm font-medium text-slate-700" htmlFor={kindId}>
              Content kind
            </label>
            <Select
              disabled={disabled}
              id={kindId}
              value={kind}
              onChange={(event) => setKind(event.target.value as LearningContentKind)}
            >
              <option value="TEXT">Text</option>
              <option value="VIDEO">Video</option>
              <option value="EMBED">Embed</option>
              <option value="FILE">File</option>
              <option value="LIVE_SESSION">Live session</option>
              <option value="EXTERNAL_LINK">External link</option>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor={minutesId}>
              Estimated minutes
            </label>
            <Input
              disabled={disabled}
              id={minutesId}
              inputMode="numeric"
              value={estimatedMinutes}
              onChange={(event) => setEstimatedMinutes(event.target.value)}
              placeholder="10"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-slate-700" htmlFor={refId}>
              Content reference
            </label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  disabled={disabled}
                  id={refId}
                  value={contentRef}
                  onChange={(event) => setContentRef(event.target.value)}
                  placeholder="doc://welcome-pack or https://..."
                />
              </div>
              {['VIDEO', 'FILE'].includes(kind) ? (
                <Button
                  disabled={disabled}
                  onClick={() => setPickerOpen(true)}
                  type="button"
                  data-testid="lesson-pick-media-button"
                >
                  Pick media
                </Button>
              ) : null}
            </div>
          </div>

          <label
            className="flex items-center gap-2 text-sm text-slate-700 md:col-span-2"
            htmlFor={requiredId}
          >
            <input
              checked={isRequired}
              className="h-4 w-4 rounded border-slate-300"
              disabled={disabled}
              id={requiredId}
              onChange={(event) => setIsRequired(event.target.checked)}
              type="checkbox"
            />
            Required lesson
          </label>

          {error ? <p className="text-sm text-rose-600 md:col-span-2">{error}</p> : null}

          <div className="md:col-span-2" data-testid="lesson-create-submit">
            <Button disabled={disabled || isPending} type="submit">
              {isPending ? 'Adding...' : 'Add lesson'}
            </Button>
          </div>
        </form>
      </Card>

      <AssetPickerDialog
        {...(kind === 'VIDEO' ? { allowedCategories: ['VIDEO'] } : {})}
        assets={assets}
        onOpenChange={setPickerOpen}
        onSelect={(selected) => {
          const first = selected?.[0];
          if (first) {
            setContentRef(first.id);
          }
        }}
        open={pickerOpen}
        selectionMode="single"
      />
    </div>
  );
}
