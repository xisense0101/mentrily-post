import type { ReactNode } from 'react';
import type { LearningSectionContract } from '../../types';
import { LessonKindBadge } from './lesson-kind-badge';

interface LearningSectionListProps {
  sections: LearningSectionContract[];
  lessonMeta?: (lessonId: string) => ReactNode;
  emptyMessage?: string;
}

export function LearningSectionList({
  sections,
  lessonMeta,
  emptyMessage = 'No sections or lessons yet.',
}: LearningSectionListProps) {
  const orderedSections = [...sections].sort((left, right) => left.position - right.position);

  if (orderedSections.length === 0) {
    return (
      <div
        className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500"
        data-testid="learning-empty-state"
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orderedSections.map((section) => (
        <section
          key={section.id}
          className="rounded-2xl border border-slate-200 bg-white p-5"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{section.title}</h3>
              <p className="text-sm text-slate-500">
                Section {section.position + 1} · {section.lessons.length} lessons
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {[...section.lessons]
              .sort((left, right) => left.position - right.position)
              .map((lesson) => (
                <div
                  key={lesson.id}
                  className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-slate-900">{lesson.title}</p>
                        <LessonKindBadge kind={lesson.kind} />
                        {lesson.isRequired ? (
                          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Required
                          </span>
                        ) : null}
                      </div>
                      <p className="text-sm text-slate-500">
                        Lesson {lesson.position + 1}
                        {lesson.estimatedMinutes
                          ? ` · ${lesson.estimatedMinutes} min`
                          : ''}
                      </p>
                      {lesson.contentRef ? (
                        <p className="text-xs text-slate-400">{lesson.contentRef}</p>
                      ) : null}
                    </div>
                    {lessonMeta ? <div>{lessonMeta(lesson.id)}</div> : null}
                  </div>
                </div>
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}
