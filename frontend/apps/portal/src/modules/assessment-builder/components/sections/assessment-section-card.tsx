'use client';

import { Input, Textarea } from '@mentrily/ui-system';
import { useId, useState } from 'react';
import type {
  AssessmentQuestionContract,
  AssessmentQuestionKindContract,
  AssessmentSectionContract,
} from '../../types';
import { QuestionCreateToolbar } from '../questions/question-create-toolbar';
import { QuestionList } from '../questions/question-list';

interface AssessmentSectionCardProps {
  section: AssessmentSectionContract;
  onUpdateSection?:
    | ((
        sectionId: string,
        patch: Partial<Pick<AssessmentSectionContract, 'title' | 'description' | 'metadata'>>,
      ) => void)
    | undefined;
  onRemoveSection?: ((sectionId: string) => void) | undefined;
  onUpdateQuestion?:
    | ((questionId: string, patch: Partial<AssessmentQuestionContract>) => void)
    | undefined;
  onRemoveQuestion?: ((questionId: string) => void) | undefined;
  onAddQuestion?: ((kind: AssessmentQuestionKindContract, sectionId: string) => void) | undefined;
  readonly?: boolean | undefined;
}

export function AssessmentSectionCard({
  section,
  onUpdateSection,
  onRemoveSection,
  onUpdateQuestion,
  onRemoveQuestion,
  onAddQuestion,
  readonly,
}: AssessmentSectionCardProps) {
  const titleId = useId();
  const descriptionId = useId();
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div
      className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm"
      data-testid="assessment-section-card"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {isEditing && !readonly ? (
            <div className="space-y-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600" htmlFor={titleId}>
                  Section title
                </label>
                <Input
                  id={titleId}
                  onChange={(event) =>
                    onUpdateSection?.(section.id, {
                      title: event.target.value,
                    })
                  }
                  placeholder="Section title"
                  value={section.title}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600" htmlFor={descriptionId}>
                  Description (optional)
                </label>
                <Textarea
                  id={descriptionId}
                  onChange={(event) =>
                    onUpdateSection?.(section.id, {
                      description: event.target.value || undefined,
                    })
                  }
                  placeholder="Describe this section..."
                  rows={2}
                  value={section.description ?? ''}
                />
              </div>
            </div>
          ) : (
            <div>
              <h3 className="font-semibold text-slate-900">{section.title}</h3>
              {section.description ? (
                <p className="mt-0.5 text-sm text-slate-500">{section.description}</p>
              ) : null}
              <p className="mt-1 text-xs text-slate-400">
                {section.questions.length} question
                {section.questions.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {!readonly ? (
            <>
              <button
                className="rounded-lg px-2 py-1 text-xs text-slate-500 transition hover:bg-slate-100"
                onClick={() => setIsEditing((prev) => !prev)}
                type="button"
              >
                {isEditing ? 'Done' : 'Edit'}
              </button>
              {onRemoveSection ? (
                <button
                  aria-label={`Remove section: ${section.title}`}
                  className="rounded-lg px-2 py-1 text-xs text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                  onClick={() => onRemoveSection(section.id)}
                  type="button"
                >
                  Remove
                </button>
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        <QuestionList
          onRemoveQuestion={onRemoveQuestion}
          onUpdateQuestion={onUpdateQuestion}
          questions={section.questions}
          readonly={readonly}
        />

        {!readonly && onAddQuestion ? (
          <QuestionCreateToolbar onAdd={(kind) => onAddQuestion(kind, section.id)} />
        ) : null}
      </div>
    </div>
  );
}
