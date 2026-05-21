import { expect, test } from '@playwright/test';
import {
  getLearnerResult,
  setupReleasedAssessmentResult,
} from './helpers/assessment-result-api-e2e-client';
import {
  setAssessmentResultCreatorContext,
  setAssessmentResultLearnerContext,
} from './helpers/assessment-result-e2e-context';
import { assessmentResultE2ESelectors } from './helpers/assessment-result-e2e-selectors';

test('instructor releases graded result and learner views it', async ({ page }) => {
  const creator = await setAssessmentResultCreatorContext(page);
  const learner = await setAssessmentResultLearnerContext(page);
  const setup = await setupReleasedAssessmentResult({
    creatorContext: creator,
    learnerContext: learner,
    assessmentInput: {
      title: `Result Release ${Date.now()}`,
      purpose: 'QUIZ',
      visibility: 'PRIVATE',
    },
  });

  await page.goto(`/grading/results/${setup.attempt.id}`);
  await expect(page.locator(assessmentResultE2ESelectors.instructorResultPage)).toBeVisible();
  await expect(page.locator(assessmentResultE2ESelectors.releaseResultButton)).toBeDisabled();
  await page.goto(`/attempts/${setup.attempt.id}/result`);
  await expect(page.locator(assessmentResultE2ESelectors.learnerResultPage)).toBeVisible();
  await expect(page.locator(assessmentResultE2ESelectors.learnerResultScoreCard)).toContainText(
    '4 / 4',
  );
  await expect(page.locator('body')).not.toContainText('correctOptionIds');
});

test('learner cannot view unreleased result', async ({ page }) => {
  const creator = await setAssessmentResultCreatorContext(page);
  const learner = await setAssessmentResultLearnerContext(page);
  const setup = await setupReleasedAssessmentResult({
    creatorContext: creator,
    learnerContext: learner,
    assessmentInput: {
      title: `Unreleased Result ${Date.now()}`,
      purpose: 'QUIZ',
      visibility: 'PRIVATE',
    },
    release: false,
  });

  await page.goto(`/attempts/${setup.attempt.id}/result`);
  await expect(page.locator(assessmentResultE2ESelectors.resultErrorState)).toBeVisible();
  await expect(page.locator('body')).not.toContainText('4 / 4');
});

test('learner cannot release result', async ({ page }) => {
  const creator = await setAssessmentResultCreatorContext(page);
  const learner = await setAssessmentResultLearnerContext(page);
  const setup = await setupReleasedAssessmentResult({
    creatorContext: creator,
    learnerContext: learner,
    assessmentInput: {
      title: `Learner Release Denied ${Date.now()}`,
      purpose: 'QUIZ',
      visibility: 'PRIVATE',
    },
    release: false,
  });

  await expect(getLearnerResult(learner, setup.attempt.id)).rejects.toThrow();
});

test('cross-workspace result protection', async ({ page }) => {
  const creatorA = await setAssessmentResultCreatorContext(page);
  const learnerA = await setAssessmentResultLearnerContext(page);
  const setup = await setupReleasedAssessmentResult({
    creatorContext: creatorA,
    learnerContext: learnerA,
    assessmentInput: {
      title: `Workspace Result ${Date.now()}`,
      purpose: 'QUIZ',
      visibility: 'PRIVATE',
    },
  });
  await setAssessmentResultCreatorContext(page, '8aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  await page.goto(`/grading/results/${setup.attempt.id}`);
  await expect(page.locator(assessmentResultE2ESelectors.resultErrorState)).toBeVisible();
});
