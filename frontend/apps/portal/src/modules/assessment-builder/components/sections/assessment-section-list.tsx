import type {
  AssessmentQuestionContract,
  AssessmentQuestionKindContract,
  AssessmentSectionContract,
} from '../../types';
import { AssessmentSectionCard } from './assessment-section-card';

interface AssessmentSectionListProps {
  sections: AssessmentSectionContract[];
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

export function AssessmentSectionList({
  sections,
  onUpdateSection,
  onRemoveSection,
  onUpdateQuestion,
  onRemoveQuestion,
  onAddQuestion,
  readonly,
}: AssessmentSectionListProps) {
  if (sections.length === 0) {
    return (
      <div
        className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-center"
        data-testid="section-list-empty"
      >
        <p className="text-sm text-slate-500">
          No sections yet. Add a section to organize your questions.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4" data-testid="assessment-section-list">
      {sections.map((section) => (
        <AssessmentSectionCard
          key={section.id}
          onAddQuestion={onAddQuestion}
          onRemoveQuestion={onRemoveQuestion}
          onRemoveSection={onRemoveSection}
          onUpdateQuestion={onUpdateQuestion}
          onUpdateSection={onUpdateSection}
          readonly={readonly}
          section={section}
        />
      ))}
    </div>
  );
}
