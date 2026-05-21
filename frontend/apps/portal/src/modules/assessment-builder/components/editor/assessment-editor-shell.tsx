import type {
  AssessmentContract,
  AssessmentPublishedSnapshotContract,
  AssessmentQuestionContract,
  AssessmentQuestionKindContract,
  AssessmentSectionContract,
  GradingRubricContract,
  GradingRuleContract,
  UpdateAssessmentRequest,
} from '../../types';
import { QuestionCreateToolbar } from '../questions/question-create-toolbar';
import { QuestionList } from '../questions/question-list';
import { AssessmentSectionCreateForm } from '../sections/assessment-section-create-form';
import { AssessmentSectionList } from '../sections/assessment-section-list';
import { AssessmentEditorActionBar } from './assessment-editor-action-bar';
import { AssessmentEditorHeader } from './assessment-editor-header';
import { AssessmentPublishPanel } from './assessment-publish-panel';
import { AssessmentSettingsPanel } from './assessment-settings-panel';

interface AssessmentEditorShellProps {
  assessment: AssessmentContract;
  localSections: AssessmentSectionContract[];
  localLooseQuestions: AssessmentQuestionContract[];
  localGradingRubrics: GradingRubricContract[];
  localGradingRules: GradingRuleContract[];
  latestSnapshot?: AssessmentPublishedSnapshotContract | null | undefined;
  errorMessage?: string | null | undefined;
  isSaving?: boolean | undefined;
  isPublishing?: boolean | undefined;
  isArchiving?: boolean | undefined;
  isRestoring?: boolean | undefined;
  isRenaming?: boolean | undefined;
  onRename?: ((title: string) => void) | undefined;
  onUpdateSettings?: ((input: UpdateAssessmentRequest) => void) | undefined;
  onSaveContent?: (() => void) | undefined;
  onPublish?: (() => void) | undefined;
  onArchive?: (() => void) | undefined;
  onRestore?: (() => void) | undefined;
  onAddSection?: ((input: { title: string; description?: string | undefined }) => void) | undefined;
  onUpdateSection?:
    | ((
        sectionId: string,
        patch: Partial<Pick<AssessmentSectionContract, 'title' | 'description' | 'metadata'>>,
      ) => void)
    | undefined;
  onRemoveSection?: ((sectionId: string) => void) | undefined;
  onAddQuestion?:
    | ((kind: AssessmentQuestionKindContract, sectionId?: string | undefined) => void)
    | undefined;
  onUpdateQuestion?:
    | ((questionId: string, patch: Partial<AssessmentQuestionContract>) => void)
    | undefined;
  onRemoveQuestion?: ((questionId: string) => void) | undefined;
}

export function AssessmentEditorShell({
  assessment,
  localSections,
  localLooseQuestions,
  latestSnapshot,
  errorMessage,
  isSaving,
  isPublishing,
  isArchiving,
  isRestoring,
  isRenaming,
  onRename,
  onUpdateSettings,
  onSaveContent,
  onPublish,
  onArchive,
  onRestore,
  onAddSection,
  onUpdateSection,
  onRemoveSection,
  onAddQuestion,
  onUpdateQuestion,
  onRemoveQuestion,
}: AssessmentEditorShellProps) {
  const isArchived = assessment.status === 'ARCHIVED';

  return (
    <div className="space-y-6" data-testid="assessment-editor-shell">
      <div className="rounded-[2rem] border border-portal-border bg-white/88 p-6 shadow-portal-sm backdrop-blur">
        <AssessmentEditorHeader
          assessment={assessment}
          isRenaming={isRenaming}
          onRename={isArchived ? undefined : onRename}
          readonly={isArchived}
        />

        <div className="mt-4 border-t border-slate-100 pt-4">
          <AssessmentEditorActionBar
            isArchiving={isArchiving}
            isPublishing={isPublishing}
            isRestoring={isRestoring}
            isSaving={isSaving}
            onArchive={onArchive}
            onPublish={onPublish}
            onRestore={onRestore}
            onSave={onSaveContent}
            status={assessment.status}
          />
        </div>

        {errorMessage ? (
          <div
            className="mt-3 rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-700"
            role="alert"
          >
            {errorMessage}
          </div>
        ) : null}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,280px)]">
        <div className="space-y-5">
          <section className="space-y-3 rounded-[1.5rem] border border-portal-border bg-white/75 p-4 shadow-portal-sm backdrop-blur">
            <div className="flex items-center justify-between gap-3 px-1">
              <h2 className="font-semibold text-slate-900">Sections</h2>
              <span className="text-xs text-slate-400">
                {localSections.length} section
                {localSections.length !== 1 ? 's' : ''}
              </span>
            </div>

            <AssessmentSectionList
              onAddQuestion={
                isArchived ? undefined : (kind, sectionId) => onAddQuestion?.(kind, sectionId)
              }
              onRemoveQuestion={isArchived ? undefined : onRemoveQuestion}
              onRemoveSection={isArchived ? undefined : onRemoveSection}
              onUpdateQuestion={isArchived ? undefined : onUpdateQuestion}
              onUpdateSection={isArchived ? undefined : onUpdateSection}
              readonly={isArchived}
              sections={localSections}
            />

            {!isArchived && onAddSection ? (
              <AssessmentSectionCreateForm onSubmit={onAddSection} />
            ) : null}
          </section>

          <section className="space-y-3 rounded-[1.5rem] border border-portal-border bg-white/75 p-4 shadow-portal-sm backdrop-blur">
            <div className="flex items-center justify-between gap-3 px-1">
              <h2 className="font-semibold text-slate-900">Questions (no section)</h2>
              <span className="text-xs text-slate-400">
                {localLooseQuestions.length} question
                {localLooseQuestions.length !== 1 ? 's' : ''}
              </span>
            </div>

            <QuestionList
              onRemoveQuestion={isArchived ? undefined : onRemoveQuestion}
              onUpdateQuestion={isArchived ? undefined : onUpdateQuestion}
              questions={localLooseQuestions}
              readonly={isArchived}
            />

            {!isArchived && onAddQuestion ? (
              <QuestionCreateToolbar disabled={isArchived} onAdd={(kind) => onAddQuestion(kind)} />
            ) : null}
          </section>
        </div>

        <div className="space-y-4">
          <AssessmentPublishPanel assessment={assessment} latestSnapshot={latestSnapshot} />
          <AssessmentSettingsPanel
            assessment={assessment}
            disabled={isArchived}
            onUpdate={onUpdateSettings}
          />
        </div>
      </div>
    </div>
  );
}
