'use client';

import { useEffect, useState } from 'react';
import type { assessmentApiClient } from '../api';
import {
  appendLooseQuestion,
  appendQuestionToSection,
  appendSection,
  createCodeQuestionPlaceholder,
  createEmptySection,
  createFileUploadQuestion,
  createLongAnswerQuestion,
  createMcqQuestion,
  createMultiSelectQuestion,
  createReadingPassageQuestion,
  createShortAnswerQuestion,
  createTrueFalseQuestion,
  normalizeQuestionPositions,
  normalizeSectionPositions,
  removeQuestion,
  removeSection,
  toReplaceAssessmentContentRequest,
  updateQuestion,
  updateSection,
} from '../state';
import type {
  AssessmentContract,
  AssessmentPublishedSnapshotContract,
  AssessmentQuestionContract,
  AssessmentQuestionKindContract,
  AssessmentSectionContract,
  GradingRubricContract,
  GradingRuleContract,
  UpdateAssessmentRequest,
} from '../types';

type AssessmentApi = Pick<
  typeof assessmentApiClient,
  | 'archiveAssessment'
  | 'getAssessment'
  | 'publishAssessment'
  | 'replaceAssessmentContent'
  | 'restoreAssessment'
  | 'updateAssessment'
  | 'getLatestAssessmentSnapshot'
>;

function sectionsFromAssessment(
  assessment: AssessmentContract | null,
): AssessmentSectionContract[] {
  return normalizeSectionPositions(assessment?.currentDraftVersion?.sections ?? []);
}

function looseQuestionsFromAssessment(
  assessment: AssessmentContract | null,
): AssessmentQuestionContract[] {
  return normalizeQuestionPositions(assessment?.currentDraftVersion?.looseQuestions ?? []);
}

export function useAssessment(assessmentId: string, apiClient: AssessmentApi) {
  const [assessment, setAssessment] = useState<AssessmentContract | null>(null);
  const [latestSnapshot, setLatestSnapshot] = useState<AssessmentPublishedSnapshotContract | null>(
    null,
  );
  const [localSections, setLocalSections] = useState<AssessmentSectionContract[]>([]);
  const [localLooseQuestions, setLocalLooseQuestions] = useState<AssessmentQuestionContract[]>([]);
  const [localGradingRubrics, setLocalGradingRubrics] = useState<GradingRubricContract[]>([]);
  const [localGradingRules, setLocalGradingRules] = useState<GradingRuleContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const next = await apiClient.getAssessment(assessmentId);
      setAssessment(next);
      setLocalSections(sectionsFromAssessment(next));
      setLocalLooseQuestions(looseQuestionsFromAssessment(next));
      setLocalGradingRubrics(next.gradingRubrics ?? []);
      setLocalGradingRules(next.gradingRules ?? []);
      setError(null);

      if (next.publishedSnapshotId) {
        try {
          const snapshot = await apiClient.getLatestAssessmentSnapshot(assessmentId);
          setLatestSnapshot(snapshot);
        } catch (snapshotError) {
          console.error('Failed to fetch latest snapshot:', snapshotError);
        }
      } else {
        setLatestSnapshot(null);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Assessment loading failed.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [assessmentId]);

  async function renameAssessment(input: UpdateAssessmentRequest) {
    if (!assessment) return;

    setIsRenaming(true);
    try {
      const next = await apiClient.updateAssessment(assessment.id, input);
      setAssessment(next);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Assessment rename failed.');
    } finally {
      setIsRenaming(false);
    }
  }

  async function updateSettings(input: UpdateAssessmentRequest) {
    if (!assessment) return;

    try {
      const next = await apiClient.updateAssessment(assessment.id, input);
      setAssessment(next);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Settings update failed.');
    }
  }

  async function saveContent() {
    if (!assessment) return;

    setIsSaving(true);
    try {
      const contentRequest = toReplaceAssessmentContentRequest({
        sections: localSections,
        looseQuestions: localLooseQuestions,
        gradingRubrics: localGradingRubrics,
        gradingRules: localGradingRules,
      });
      const next = await apiClient.replaceAssessmentContent(assessment.id, contentRequest);
      setAssessment(next);
      setLocalSections(sectionsFromAssessment(next));
      setLocalLooseQuestions(looseQuestionsFromAssessment(next));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Save failed.');
      throw cause;
    } finally {
      setIsSaving(false);
    }
  }

  async function publishAssessment() {
    if (!assessment) return;

    setIsPublishing(true);
    try {
      const next = await apiClient.publishAssessment(assessment.id);
      setAssessment(next);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Publish failed.');
      throw cause;
    } finally {
      setIsPublishing(false);
    }
  }

  async function archiveAssessment() {
    if (!assessment) return;

    setIsArchiving(true);
    try {
      const next = await apiClient.archiveAssessment(assessment.id);
      setAssessment(next);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Archive failed.');
      throw cause;
    } finally {
      setIsArchiving(false);
    }
  }

  async function restoreAssessment() {
    if (!assessment) return;

    setIsRestoring(true);
    try {
      const next = await apiClient.restoreAssessment(assessment.id);
      setAssessment(next);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Restore failed.');
      throw cause;
    } finally {
      setIsRestoring(false);
    }
  }

  function handleAppendSection(input?: { title: string; description?: string | undefined }) {
    if (!assessment) return;

    const section = createEmptySection({
      assessmentId: assessment.id,
      position: localSections.length,
      title: input?.title,
    });

    setLocalSections((current) =>
      appendSection({
        sections: current,
        section: {
          ...section,
          description: input?.description,
        },
      }),
    );
  }

  function handleUpdateSection(
    sectionId: string,
    patch: Partial<Pick<AssessmentSectionContract, 'title' | 'description' | 'metadata'>>,
  ) {
    setLocalSections((current) => updateSection({ sections: current, sectionId, patch }));
  }

  function handleRemoveSection(sectionId: string) {
    setLocalSections((current) => removeSection({ sections: current, sectionId }));
  }

  function handleAppendQuestion(kind: AssessmentQuestionKindContract, sectionId?: string) {
    if (!assessment) return;

    const position = sectionId
      ? (localSections.find((s) => s.id === sectionId)?.questions.length ?? 0)
      : localLooseQuestions.length;

    let question: AssessmentQuestionContract;

    if (kind === 'MCQ') {
      question = createMcqQuestion({
        assessmentId: assessment.id,
        position,
        ...(sectionId !== undefined ? { sectionId } : {}),
      });
    } else if (kind === 'MULTI_SELECT') {
      question = createMultiSelectQuestion({
        assessmentId: assessment.id,
        position,
        ...(sectionId !== undefined ? { sectionId } : {}),
      });
    } else if (kind === 'TRUE_FALSE') {
      question = createTrueFalseQuestion({
        assessmentId: assessment.id,
        position,
        ...(sectionId !== undefined ? { sectionId } : {}),
      });
    } else if (kind === 'SHORT_ANSWER') {
      question = createShortAnswerQuestion({
        assessmentId: assessment.id,
        position,
        ...(sectionId !== undefined ? { sectionId } : {}),
      });
    } else if (kind === 'LONG_ANSWER') {
      question = createLongAnswerQuestion({
        assessmentId: assessment.id,
        position,
        ...(sectionId !== undefined ? { sectionId } : {}),
      });
    } else if (kind === 'READING_PASSAGE') {
      question = createReadingPassageQuestion({
        assessmentId: assessment.id,
        position,
        ...(sectionId !== undefined ? { sectionId } : {}),
      });
    } else if (kind === 'FILE_UPLOAD') {
      question = createFileUploadQuestion({
        assessmentId: assessment.id,
        position,
        ...(sectionId !== undefined ? { sectionId } : {}),
      });
    } else {
      question = createCodeQuestionPlaceholder({
        assessmentId: assessment.id,
        position,
        ...(sectionId !== undefined ? { sectionId } : {}),
      });
    }

    if (sectionId) {
      setLocalSections((current) =>
        appendQuestionToSection({ sections: current, sectionId, question }),
      );
    } else {
      setLocalLooseQuestions((current) => appendLooseQuestion({ questions: current, question }));
    }
  }

  function handleUpdateQuestion(questionId: string, patch: Partial<AssessmentQuestionContract>) {
    const result = updateQuestion({
      sections: localSections,
      looseQuestions: localLooseQuestions,
      questionId,
      patch,
    });

    setLocalSections(result.sections);
    setLocalLooseQuestions(result.looseQuestions);
  }

  function handleRemoveQuestion(questionId: string) {
    const result = removeQuestion({
      sections: localSections,
      looseQuestions: localLooseQuestions,
      questionId,
    });

    setLocalSections(result.sections);
    setLocalLooseQuestions(result.looseQuestions);
  }

  return {
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
    appendSection: handleAppendSection,
    updateSection: handleUpdateSection,
    removeSection: handleRemoveSection,
    appendQuestion: handleAppendQuestion,
    updateQuestion: handleUpdateQuestion,
    removeQuestion: handleRemoveQuestion,
  };
}
