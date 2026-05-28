'use client';

import { assessmentApiClient } from '../api';
import { AssessmentEditorShell } from '../components/editor';
import { AssessmentErrorState, AssessmentPageHeader } from '../components/shared';
import { useAssessment } from '../hooks';

interface AssessmentEditorPageProps {
  assessmentId: string;
}

export function AssessmentEditorPage({ assessmentId }: AssessmentEditorPageProps) {
  const {
    assessment,
    latestSnapshot,
    localSections,
    localLooseQuestions,
    localGradingRubrics,
    localGradingRules,
    loading,
    error,
    isSaving,
    isPublishing,
    isArchiving,
    isRestoring,
    isRenaming,
    refresh,
    renameAssessment,
    updateSettings,
    saveContent,
    publishAssessment,
    archiveAssessment,
    restoreAssessment,
    appendSection,
    updateSection,
    removeSection,
    appendQuestion,
    updateQuestion,
    removeQuestion,
  } = useAssessment(assessmentId, assessmentApiClient);

  if (loading) {
    return (
      <div className="rounded-[2rem] border border-portal-border bg-white/80 p-8 text-sm text-slate-500 shadow-portal-sm">
        Loading assessment...
      </div>
    );
  }

  if (error && !assessment) {
    return <AssessmentErrorState message={error} onRetry={() => void refresh()} />;
  }

  if (!assessment) {
    return (
      <AssessmentErrorState
        message="Assessment data is unavailable."
        onRetry={() => void refresh()}
      />
    );
  }

  return (
    <div className="space-y-6" data-testid="assessment-editor-page">
      <AssessmentPageHeader
        eyebrow="Assessment Builder"
        title={assessment.title}
        description="Edit sections and questions, save your draft, and manage publish, archive, or restore actions."
        actions={
          <div className="flex gap-3">
            <a
              className="rounded-full border border-portal-border bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm"
              href={`/assessments/${assessmentId}/security`}
            >
              Security settings
            </a>
            <a
              className="rounded-full border border-portal-border bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm"
              href="/assessments"
            >
              Back to assessments
            </a>
          </div>
        }
      />

      <AssessmentEditorShell
        assessment={assessment}
        errorMessage={error}
        isArchiving={isArchiving}
        isPublishing={isPublishing}
        isRenaming={isRenaming}
        isRestoring={isRestoring}
        isSaving={isSaving}
        latestSnapshot={latestSnapshot}
        localGradingRubrics={localGradingRubrics}
        localGradingRules={localGradingRules}
        localLooseQuestions={localLooseQuestions}
        localSections={localSections}
        onAddQuestion={(kind, sectionId) => appendQuestion(kind, sectionId)}
        onAddSection={appendSection}
        onArchive={() => void archiveAssessment()}
        onPublish={() => void publishAssessment()}
        onRemoveQuestion={(questionId) => removeQuestion(questionId)}
        onRemoveSection={(sectionId) => removeSection(sectionId)}
        onRename={(title) => {
          void renameAssessment({ title });
        }}
        onRestore={() => void restoreAssessment()}
        onSaveContent={() => void saveContent()}
        onUpdateQuestion={(questionId, patch) => updateQuestion(questionId, patch)}
        onUpdateSection={(sectionId, patch) => updateSection(sectionId, patch)}
        onUpdateSettings={(input) => void updateSettings(input)}
      />
    </div>
  );
}
