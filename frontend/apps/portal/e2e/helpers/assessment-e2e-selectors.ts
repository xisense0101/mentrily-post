export const assessmentE2ESelectors = {
  assessmentsPage: '[data-testid="assessments-page"]',
  assessmentList: '[data-testid="assessment-list"]',
  assessmentCard: '[data-testid="assessment-card"]',
  assessmentOpenLink: '[data-testid="assessment-open-link"]',
  assessmentEmptyState: '[data-testid="assessment-empty-state"]',
  assessmentErrorState: '[data-testid="assessment-error-state"]',

  assessmentCreateForm: '[data-testid="assessment-create-form"]',
  assessmentTitleInput: '[data-testid="assessment-title-input"] input',
  assessmentPurposeSelect: '[data-testid="assessment-purpose-select"] select',
  assessmentVisibilitySelect: '[data-testid="assessment-visibility-select"] select',
  assessmentDescriptionInput: '[data-testid="assessment-description-input"] textarea',
  assessmentCreateSubmit: '[data-testid="assessment-create-submit"] button',

  assessmentEditorPage: '[data-testid="assessment-editor-page"]',
  assessmentEditorShell: '[data-testid="assessment-editor-shell"]',
  assessmentEditorHeader: '[data-testid="assessment-editor-header"]',
  assessmentEditorTitle: '[data-testid="assessment-editor-title"]',
  assessmentEditorStatusBadge: '[data-testid="assessment-editor-status-badge"]',
  assessmentEditorActionBar: '[data-testid="assessment-editor-action-bar"]',

  assessmentSaveContentButton: '[data-testid="assessment-save-content-button"] button',
  assessmentPublishButton: '[data-testid="assessment-publish-button"] button',
  assessmentArchiveButton: '[data-testid="assessment-archive-button"] button',
  assessmentRestoreButton: '[data-testid="assessment-restore-button"] button',

  assessmentSettingsPanel: '[data-testid="assessment-settings-panel"]',
  assessmentAttemptPolicyPanel: '[data-testid="assessment-attempt-policy-panel"]',
  assessmentTimeLimitInput: '[data-testid="assessment-time-limit-input"] input',
  assessmentResultReleaseSelect: '[data-testid="assessment-result-release-select"] select',

  assessmentSectionCreateForm: '[data-testid="assessment-section-create-form"]',
  assessmentAddSectionButton: '[data-testid="assessment-add-section-button"] button',
  assessmentSectionList: '[data-testid="assessment-section-list"]',
  assessmentSectionCard: '[data-testid="assessment-section-card"]',
  assessmentSectionTitleInput: '[data-testid="assessment-section-title-input"] input',

  assessmentQuestionCreateToolbar: '[data-testid="assessment-question-create-toolbar"]',
  assessmentAddMcqButton: '[data-testid="assessment-add-mcq-button"]',
  assessmentAddMultiSelectButton: '[data-testid="assessment-add-multi-select-button"]',
  assessmentAddTrueFalseButton: '[data-testid="assessment-add-true-false-button"]',
  assessmentAddShortAnswerButton: '[data-testid="assessment-add-short-answer-button"]',
  assessmentAddLongAnswerButton: '[data-testid="assessment-add-long-answer-button"]',
  assessmentAddCodeButton: '[data-testid="assessment-add-code-button"]',

  assessmentQuestionList: '[data-testid="assessment-question-list"]',
  assessmentQuestionShell: '[data-testid="assessment-question-shell"]',
  assessmentQuestionTitleInput: '[data-testid="assessment-question-title-input"] input',
  assessmentQuestionPromptInput: '[data-testid="assessment-question-prompt-input"] textarea',
  assessmentQuestionPointsInput: '[data-testid="assessment-question-points-input"] input',
  assessmentQuestionGradingModeSelect:
    '[data-testid="assessment-question-grading-mode-select"] select',

  assessmentOptionEditor: '[data-testid="assessment-option-editor"]',
  assessmentOptionLabelInput: '[data-testid="assessment-option-label-input"]',
  assessmentOptionValueInput: '[data-testid="assessment-option-value-input"]',
  assessmentOptionCorrectControl: '[data-testid="assessment-option-correct-control"]',

  assessmentAnswerKeyEditor: '[data-testid="assessment-answer-key-editor"]',
} as const;
