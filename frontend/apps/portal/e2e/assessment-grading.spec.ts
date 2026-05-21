import { expect, test } from '@playwright/test';
import {
  createPublishAttemptAndGrade,
  getManualReviewQueue,
  manualGrade,
} from './helpers/assessment-grading-api-e2e-client';
import {
  setAssessmentGradingCreatorContext,
  setAssessmentGradingLearnerContext,
} from './helpers/assessment-grading-e2e-context';
import { makeManualReviewAssessmentContent } from './helpers/assessment-grading-e2e-data';
import { assessmentGradingE2ESelectors } from './helpers/assessment-grading-e2e-selectors';

test('teacher reviews and manually grades pending answer', async ({ page }) => {
  const creator = await setAssessmentGradingCreatorContext(page);
  const learner = await setAssessmentGradingLearnerContext(page);
  const setup = await createPublishAttemptAndGrade({
    creatorContext: creator,
    learnerContext: learner,
    assessmentInput: {
      title: `Grading Flow ${Date.now()}`,
      purpose: 'QUIZ',
      visibility: 'PRIVATE',
    },
    content: makeManualReviewAssessmentContent(),
  });

  await page.goto('/grading/manual-review');
  await expect(page.locator(assessmentGradingE2ESelectors.manualReviewPage)).toBeVisible();
  await expect(
    page.locator(assessmentGradingE2ESelectors.manualReviewItemCard).first(),
  ).toBeVisible();
  await page
    .locator(
      `a[data-testid="manual-review-open-run-link"][href="/grading/runs/${setup.gradingRun.id}"]`,
    )
    .first()
    .click();

  await expect(page.locator(assessmentGradingE2ESelectors.gradingRunPage)).toBeVisible();
  await page.locator(assessmentGradingE2ESelectors.manualGradeScoreInput).fill('3');
  await page
    .locator(assessmentGradingE2ESelectors.manualGradeFeedbackInput)
    .fill('Complete answer');
  await page.locator(assessmentGradingE2ESelectors.manualGradeSubmitButton).click();
  await expect(page.locator(assessmentGradingE2ESelectors.gradingRunSummary)).toContainText(
    '4 / 4',
  );

  const queue = await getManualReviewQueue(creator);
  expect(queue.items.find((item) => item.gradingRunId === setup.gradingRun.id)).toBeFalsy();
});

test('manual review queue empty state', async ({ page }) => {
  await setAssessmentGradingCreatorContext(page);
  await page.goto('/grading/manual-review');
  await expect(page.locator(assessmentGradingE2ESelectors.manualReviewPage)).toBeVisible();
  const cards = await page.locator(assessmentGradingE2ESelectors.manualReviewItemCard).count();
  if (cards === 0) {
    await expect(page.locator(assessmentGradingE2ESelectors.manualReviewEmptyState)).toBeVisible();
  }
});

test('score validation blocks invalid submit', async ({ page }) => {
  const creator = await setAssessmentGradingCreatorContext(page);
  const learner = await setAssessmentGradingLearnerContext(page);
  const setup = await createPublishAttemptAndGrade({
    creatorContext: creator,
    learnerContext: learner,
    assessmentInput: {
      title: `Score Validation ${Date.now()}`,
      purpose: 'QUIZ',
      visibility: 'PRIVATE',
    },
    content: makeManualReviewAssessmentContent(),
  });

  await page.goto(`/grading/runs/${setup.gradingRun.id}`);
  await expect(page.locator(assessmentGradingE2ESelectors.gradingRunPage)).toBeVisible();
  await page.locator(assessmentGradingE2ESelectors.manualGradeScoreInput).fill('99');
  await page.locator(assessmentGradingE2ESelectors.manualGradeSubmitButton).click();
  await expect(page.locator('text=Score cannot be greater than max score.')).toBeVisible();
});

test('cross-workspace protection', async ({ page }) => {
  const creatorA = await setAssessmentGradingCreatorContext(page);
  const learnerA = await setAssessmentGradingLearnerContext(page);
  const setup = await createPublishAttemptAndGrade({
    creatorContext: creatorA,
    learnerContext: learnerA,
    assessmentInput: {
      title: `Workspace Guard ${Date.now()}`,
      purpose: 'QUIZ',
      visibility: 'PRIVATE',
    },
    content: makeManualReviewAssessmentContent(),
  });

  const creatorB = await setAssessmentGradingCreatorContext(
    page,
    '95555555-5555-4555-8555-555555555555',
  );
  await page.goto('/grading/manual-review');
  await expect(page.locator(assessmentGradingE2ESelectors.manualReviewPage)).toBeVisible();
  await expect(page.locator(assessmentGradingE2ESelectors.manualReviewItemCard)).toHaveCount(0);

  await expect(
    manualGrade(creatorB, setup.gradingRun.id, setup.gradingRun.answerGrades[1]!.answerId, 2),
  ).rejects.toThrow();
});
