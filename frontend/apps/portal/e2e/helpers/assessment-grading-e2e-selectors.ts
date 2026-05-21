export const assessmentGradingE2ESelectors = {
  manualReviewPage: '[data-testid="manual-review-page"]',
  manualReviewList: '[data-testid="manual-review-list"]',
  manualReviewItemCard: '[data-testid="manual-review-item-card"]',
  manualReviewEmptyState: '[data-testid="manual-review-empty-state"]',
  manualReviewOpenRunLink: '[data-testid="manual-review-open-run-link"]',
  gradingRunPage: '[data-testid="grading-run-page"]',
  gradingRunSummary: '[data-testid="grading-run-summary"]',
  manualGradeForm: '[data-testid="manual-grade-form"]',
  manualGradeScoreInput: '[data-testid="manual-grade-score-input"]',
  manualGradeFeedbackInput: '[data-testid="manual-grade-feedback-input"]',
  manualGradeSubmitButton: '[data-testid="manual-grade-submit-button"]',
} as const;
