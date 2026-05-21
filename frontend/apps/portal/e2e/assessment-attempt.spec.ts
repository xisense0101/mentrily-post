import { expect, test } from '@playwright/test';
import {
  createAndPublishAssessmentForAttempt,
  getAssessmentAttemptSnapshotViaApi,
  getAssessmentAttemptViaApi,
  saveAssessmentAttemptAnswerViaApi,
} from './helpers/assessment-attempt-api-e2e-client';
import {
  assessmentAttemptE2EDefaults,
  clearAssessmentAttemptE2EContext,
  setAssessmentAttemptCreatorContext,
  setAssessmentAttemptLearnerContext,
} from './helpers/assessment-attempt-e2e-context';
import { makeAttemptQuestionSet } from './helpers/assessment-attempt-e2e-data';
import { assessmentAttemptE2ESelectors } from './helpers/assessment-attempt-e2e-selectors';

function makeAssessmentInput(title: string) {
  return {
    title,
    purpose: 'QUIZ' as const,
    visibility: 'PRIVATE' as const,
    description: 'Assessment attempt E2E fixture',
  };
}

test('learner starts, answers, saves, and submits an attempt through real frontend and backend', async ({
  page,
}) => {
  const creatorContext = await setAssessmentAttemptCreatorContext(page);
  const learnerContext = await setAssessmentAttemptLearnerContext(page);
  const questionSet = makeAttemptQuestionSet();
  const { assessmentId } = await createAndPublishAssessmentForAttempt(
    creatorContext,
    makeAssessmentInput(`Attempt Flow ${Date.now()}`),
    questionSet.content,
  );

  await page.goto(`/assessments/${assessmentId}/attempt`);
  await expect(page.locator(assessmentAttemptE2ESelectors.attemptStartPage)).toBeVisible();
  await page.locator(assessmentAttemptE2ESelectors.attemptStartButton).click();

  await expect(page).toHaveURL(/\/attempts\/.+/);
  await expect(page.locator(assessmentAttemptE2ESelectors.attemptRunnerPage)).toBeVisible();
  await expect(page.locator(assessmentAttemptE2ESelectors.attemptQuestionCard)).toHaveCount(6);

  const cards = page.locator(assessmentAttemptE2ESelectors.attemptQuestionCard);

  await cards.nth(0).locator('input[type="radio"]').nth(1).check();
  await cards.nth(0).locator(assessmentAttemptE2ESelectors.attemptSaveAnswerButton).click();

  await cards.nth(1).locator('input[type="checkbox"]').nth(0).check();
  await cards.nth(1).locator('input[type="checkbox"]').nth(1).check();
  await cards.nth(1).locator(assessmentAttemptE2ESelectors.attemptSaveAnswerButton).click();

  await cards.nth(2).locator('input[type="radio"]').first().check();
  await cards.nth(2).locator(assessmentAttemptE2ESelectors.attemptSaveAnswerButton).click();

  await cards.nth(3).locator('input[type="text"]').fill('Short answer value');
  await cards.nth(3).locator(assessmentAttemptE2ESelectors.attemptSaveAnswerButton).click();

  await cards.nth(4).locator('textarea').fill('Long answer value');
  await cards.nth(4).locator(assessmentAttemptE2ESelectors.attemptSaveAnswerButton).click();

  await cards.nth(5).locator('textarea').fill('function solve() { return 42; }');
  await cards.nth(5).locator(assessmentAttemptE2ESelectors.attemptSaveAnswerButton).click();

  await page.locator(assessmentAttemptE2ESelectors.attemptSubmitButton).click();
  await expect(page.locator(assessmentAttemptE2ESelectors.attemptStatusBadge)).toContainText(
    'Submitted',
  );
  await expect(page.locator(assessmentAttemptE2ESelectors.attemptResultPlaceholder)).toBeVisible();

  const attemptId = page.url().split('/').pop();
  expect(attemptId).toBeTruthy();

  const backendAttempt = await getAssessmentAttemptViaApi(learnerContext, attemptId!);
  expect(backendAttempt.status).toBe('SUBMITTED');
  expect(backendAttempt.answers).toHaveLength(6);

  const backendSnapshot = await getAssessmentAttemptSnapshotViaApi(learnerContext, attemptId!);
  expect(backendSnapshot.versionNumber).toBeGreaterThan(0);
  expect(backendSnapshot.sections[0]?.questions[0]?.title).toBe('MCQ question');
});

test('learner can resume an in-progress attempt', async ({ page }) => {
  const creatorContext = await setAssessmentAttemptCreatorContext(page);
  const learnerContext = await setAssessmentAttemptLearnerContext(page);
  const questionSet = makeAttemptQuestionSet();
  const { assessmentId } = await createAndPublishAssessmentForAttempt(
    creatorContext,
    makeAssessmentInput(`Resume Flow ${Date.now()}`),
    questionSet.content,
  );

  await page.goto(`/assessments/${assessmentId}/attempt`);
  await page.locator(assessmentAttemptE2ESelectors.attemptStartButton).click();
  await expect(page).toHaveURL(/\/attempts\/.+/);

  const cards = page.locator(assessmentAttemptE2ESelectors.attemptQuestionCard);
  await cards.nth(3).locator('input[type="text"]').fill('Resume me');
  await cards.nth(3).locator(assessmentAttemptE2ESelectors.attemptSaveAnswerButton).click();

  const attemptId = page.url().split('/').pop();
  await page.reload();
  await expect(cards.nth(3).locator('input[type="text"]')).toHaveValue('Resume me');
  await expect(page.locator(assessmentAttemptE2ESelectors.attemptStatusBadge)).toContainText(
    'In progress',
  );

  const backendAttempt = await getAssessmentAttemptViaApi(learnerContext, attemptId!);
  expect(backendAttempt.status).toBe('IN_PROGRESS');
});

test('submitted attempt is read-only after reload', async ({ page }) => {
  const creatorContext = await setAssessmentAttemptCreatorContext(page);
  const learnerContext = await setAssessmentAttemptLearnerContext(page);
  const questionSet = makeAttemptQuestionSet();
  const { assessmentId } = await createAndPublishAssessmentForAttempt(
    creatorContext,
    makeAssessmentInput(`Readonly Flow ${Date.now()}`),
    questionSet.content,
  );

  await page.goto(`/assessments/${assessmentId}/attempt`);
  await page.locator(assessmentAttemptE2ESelectors.attemptStartButton).click();
  await expect(page).toHaveURL(/\/attempts\/.+/);

  const attemptId = page.url().split('/').pop();
  await saveAssessmentAttemptAnswerViaApi(
    learnerContext,
    attemptId!,
    questionSet.questions.shortAnswer.id,
    {
      questionId: questionSet.questions.shortAnswer.id,
      questionKind: 'SHORT_ANSWER',
      answer: { text: 'Ready to submit' },
    },
  );
  await page.reload();
  await page.locator(assessmentAttemptE2ESelectors.attemptSubmitButton).click();
  await page.reload();

  await expect(page.locator(assessmentAttemptE2ESelectors.attemptResultPlaceholder)).toBeVisible();
  await expect(page.locator('input[type="radio"]').first()).toBeDisabled();
  await expect(page.locator('textarea').last()).toBeDisabled();
});

test('missing context fails gracefully', async ({ page }) => {
  await clearAssessmentAttemptE2EContext(page);
  await page.goto('/attempts');

  await expect(page.locator(assessmentAttemptE2ESelectors.attemptErrorState)).toBeVisible();
  await expect(page).toHaveURL(/\/attempts/);
});

test('cross-workspace attempt protection blocks access', async ({ page }) => {
  const creatorContext = await setAssessmentAttemptCreatorContext(page);
  const workspaceA = await setAssessmentAttemptLearnerContext(page, {
    workspaceId: assessmentAttemptE2EDefaults.workspaceId,
  });
  const questionSet = makeAttemptQuestionSet();
  const { assessmentId } = await createAndPublishAssessmentForAttempt(
    creatorContext,
    makeAssessmentInput(`Workspace Guard ${Date.now()}`),
    questionSet.content,
  );

  await page.goto(`/assessments/${assessmentId}/attempt`);
  await page.locator(assessmentAttemptE2ESelectors.attemptStartButton).click();
  await expect(page).toHaveURL(/\/attempts\/.+/);
  const attemptId = page.url().split('/').pop();

  await setAssessmentAttemptLearnerContext(page, {
    workspaceId: '88888888-8888-4888-8888-888888888888',
    actorId: workspaceA.actorId,
  });
  await page.goto(`/attempts/${attemptId}`);

  await expect(page.locator(assessmentAttemptE2ESelectors.attemptErrorState)).toBeVisible();
});
