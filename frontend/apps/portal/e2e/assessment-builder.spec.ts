import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  archiveAssessmentViaApi,
  createAssessmentViaApi,
  getAssessmentViaApi,
  getLatestSnapshotViaApi,
  publishAssessmentViaApi,
  replaceAssessmentContentViaApi,
} from './helpers/assessment-api-e2e-client';
import {
  clearAssessmentE2EContext,
  setAssessmentCreatorContext,
} from './helpers/assessment-e2e-context';
import {
  makeAssessmentContentInput,
  makeAssessmentInput,
  makeAssessmentSectionInput,
  makeMcqQuestionInput,
} from './helpers/assessment-e2e-data';
import { assessmentE2ESelectors } from './helpers/assessment-e2e-selectors';

async function createAssessmentThroughUi(page: Page, title: string) {
  await page.goto('/assessments');
  await expect(page.locator(assessmentE2ESelectors.assessmentsPage)).toBeVisible();
  await page.locator(assessmentE2ESelectors.assessmentTitleInput).fill(title);
  await page.locator(assessmentE2ESelectors.assessmentPurposeSelect).selectOption('QUIZ');
  await page.locator(assessmentE2ESelectors.assessmentVisibilitySelect).selectOption('PRIVATE');
  await page
    .locator(assessmentE2ESelectors.assessmentDescriptionInput)
    .fill('Assessment created by Assessment E2E');
  await page.locator(assessmentE2ESelectors.assessmentCreateSubmit).click();
}

async function openAssessmentEditor(page: Page, title: string) {
  const assessmentOpenLink = page
    .locator(assessmentE2ESelectors.assessmentOpenLink)
    .filter({ hasText: title })
    .first();

  await expect(assessmentOpenLink).toBeVisible();
  await assessmentOpenLink.click();
  await expect(page.locator(assessmentE2ESelectors.assessmentEditorPage)).toBeVisible();
}

async function fillQuestionShell(
  questionShell: Locator,
  input: {
    title: string;
    prompt: string;
    points: string;
    gradingMode: 'AUTO' | 'MANUAL';
  },
) {
  await questionShell
    .locator(assessmentE2ESelectors.assessmentQuestionTitleInput)
    .fill(input.title);
  await questionShell
    .locator(assessmentE2ESelectors.assessmentQuestionPromptInput)
    .fill(input.prompt);
  await questionShell
    .locator(assessmentE2ESelectors.assessmentQuestionPointsInput)
    .fill(input.points);
  await questionShell
    .locator(assessmentE2ESelectors.assessmentQuestionGradingModeSelect)
    .selectOption(input.gradingMode);
}

async function fillQuestionSet(page: Page) {
  const sectionCreateForm = page.locator(assessmentE2ESelectors.assessmentSectionCreateForm);
  await sectionCreateForm
    .locator(assessmentE2ESelectors.assessmentSectionTitleInput)
    .fill('Section A');
  await sectionCreateForm.locator(assessmentE2ESelectors.assessmentAddSectionButton).click();

  const sectionCard = page.locator(assessmentE2ESelectors.assessmentSectionCard).first();
  await expect(sectionCard).toBeVisible();
  await sectionCard.locator(assessmentE2ESelectors.assessmentAddMcqButton).click();

  const looseQuestionSection = page
    .locator('section')
    .filter({ hasText: 'Questions (no section)' })
    .first();
  await looseQuestionSection.locator(assessmentE2ESelectors.assessmentAddMultiSelectButton).click();
  await looseQuestionSection.locator(assessmentE2ESelectors.assessmentAddTrueFalseButton).click();
  await looseQuestionSection.locator(assessmentE2ESelectors.assessmentAddShortAnswerButton).click();
  await looseQuestionSection.locator(assessmentE2ESelectors.assessmentAddLongAnswerButton).click();
  await looseQuestionSection.locator(assessmentE2ESelectors.assessmentAddCodeButton).click();

  const questionShells = page.locator(assessmentE2ESelectors.assessmentQuestionShell);
  await expect(questionShells).toHaveCount(6);

  const mcqInSection = sectionCard.locator(assessmentE2ESelectors.assessmentQuestionShell).first();
  await fillQuestionShell(mcqInSection, {
    title: 'MCQ question',
    prompt: 'Choose the correct option.',
    points: '2',
    gradingMode: 'AUTO',
  });
  await mcqInSection.locator(assessmentE2ESelectors.assessmentOptionCorrectControl).first().check();
  await mcqInSection
    .locator(assessmentE2ESelectors.assessmentOptionLabelInput)
    .first()
    .fill('Correct option');

  const looseQuestions = page.locator(assessmentE2ESelectors.assessmentQuestionList).last();
  const looseShells = looseQuestions.locator(assessmentE2ESelectors.assessmentQuestionShell);

  await fillQuestionShell(looseShells.nth(0), {
    title: 'Multi-select question',
    prompt: 'Select both valid answers.',
    points: '3',
    gradingMode: 'MANUAL',
  });
  await looseShells
    .nth(0)
    .locator(assessmentE2ESelectors.assessmentOptionCorrectControl)
    .nth(0)
    .check();
  await looseShells
    .nth(0)
    .locator(assessmentE2ESelectors.assessmentOptionCorrectControl)
    .nth(1)
    .check();

  await fillQuestionShell(looseShells.nth(1), {
    title: 'True false question',
    prompt: 'This statement is true.',
    points: '1',
    gradingMode: 'AUTO',
  });
  await looseShells
    .nth(1)
    .locator(assessmentE2ESelectors.assessmentOptionCorrectControl)
    .first()
    .check();

  await fillQuestionShell(looseShells.nth(2), {
    title: 'Short answer question',
    prompt: 'Name the capital of Nepal.',
    points: '2',
    gradingMode: 'MANUAL',
  });
  await looseShells
    .nth(2)
    .locator(assessmentE2ESelectors.assessmentAnswerKeyEditor)
    .locator('textarea')
    .fill('Kathmandu');

  await fillQuestionShell(looseShells.nth(3), {
    title: 'Long answer question',
    prompt: 'Explain your reasoning.',
    points: '5',
    gradingMode: 'MANUAL',
  });
  await looseShells
    .nth(3)
    .locator(assessmentE2ESelectors.assessmentAnswerKeyEditor)
    .locator('textarea')
    .fill('Use a rubric for coherence and depth.');

  await fillQuestionShell(looseShells.nth(4), {
    title: 'Code placeholder question',
    prompt: 'Write pseudocode for sorting.',
    points: '4',
    gradingMode: 'MANUAL',
  });
  await looseShells
    .nth(4)
    .locator(assessmentE2ESelectors.assessmentAnswerKeyEditor)
    .locator('textarea')
    .fill('Sorted output in ascending order.');
}

test('creator creates, edits, saves, and publishes an assessment through the real UI and backend', async ({
  page,
}) => {
  const context = await setAssessmentCreatorContext(page);
  const assessmentInput = makeAssessmentInput();

  await createAssessmentThroughUi(page, assessmentInput.title);
  await expect(page.locator(assessmentE2ESelectors.assessmentList)).toContainText(
    assessmentInput.title,
  );

  await openAssessmentEditor(page, assessmentInput.title);
  await fillQuestionSet(page);

  await page.locator(assessmentE2ESelectors.assessmentSaveContentButton).click();
  await expect(page.locator(assessmentE2ESelectors.assessmentPublishButton)).toBeVisible();

  await page.locator(assessmentE2ESelectors.assessmentPublishButton).click();
  await expect(page.locator(assessmentE2ESelectors.assessmentEditorStatusBadge)).toContainText(
    'Published',
  );

  const assessmentId = page.url().split('/').pop();
  expect(assessmentId).toBeTruthy();

  const snapshot = await getLatestSnapshotViaApi(context, assessmentId!);
  expect(snapshot.versionNumber).toBeGreaterThan(0);
  expect(snapshot.publishedAt).toBeTruthy();
});

test('creator archives and restores an assessment', async ({ page }) => {
  const context = await setAssessmentCreatorContext(page);
  const assessment = await createAssessmentViaApi(context, makeAssessmentInput());
  const section = makeAssessmentSectionInput('Archive Section', 0);
  const content = makeAssessmentContentInput([
    { ...section, questions: [makeMcqQuestionInput(0)] },
  ]);

  await replaceAssessmentContentViaApi(context, assessment.id, content);
  await publishAssessmentViaApi(context, assessment.id);

  await page.goto(`/assessments/${assessment.id}`);
  await expect(page.locator(assessmentE2ESelectors.assessmentEditorPage)).toBeVisible();

  await page.locator(assessmentE2ESelectors.assessmentArchiveButton).click();
  await expect(page.locator(assessmentE2ESelectors.assessmentEditorStatusBadge)).toContainText(
    'Archived',
  );
  await expect(page.locator(assessmentE2ESelectors.assessmentRestoreButton)).toBeVisible();
  await expect(page.locator(assessmentE2ESelectors.assessmentSaveContentButton)).toHaveCount(0);

  await page.locator(assessmentE2ESelectors.assessmentRestoreButton).click();
  await page.reload();
  await expect(page.locator(assessmentE2ESelectors.assessmentEditorStatusBadge)).toContainText(
    'Draft',
  );
  await expect(page.locator(assessmentE2ESelectors.assessmentSaveContentButton)).toBeVisible();

  const looseQuestionSection = page
    .locator('section')
    .filter({ hasText: 'Questions (no section)' })
    .first();
  await looseQuestionSection.locator(assessmentE2ESelectors.assessmentAddShortAnswerButton).click();
  const questionShell = page.locator(assessmentE2ESelectors.assessmentQuestionShell).last();
  await fillQuestionShell(questionShell, {
    title: 'Restored question',
    prompt: 'Editing works after restore.',
    points: '2',
    gradingMode: 'MANUAL',
  });
  await questionShell
    .locator(assessmentE2ESelectors.assessmentAnswerKeyEditor)
    .locator('textarea')
    .fill('Restore verified');
  await page.locator(assessmentE2ESelectors.assessmentSaveContentButton).click();

  const restored = await getAssessmentViaApi(context, assessment.id);
  expect(restored.status).toBe('DRAFT');
});

test('missing request context fails gracefully', async ({ page }) => {
  await clearAssessmentE2EContext(page);
  await page.goto('/assessments');

  await expect(page.locator(assessmentE2ESelectors.assessmentErrorState)).toBeVisible();
  await expect(page).toHaveURL(/\/assessments/);
});

test('cross-workspace protection blocks reads and mutations for foreign assessments', async ({
  page,
}) => {
  const workspaceA = await setAssessmentCreatorContext(page, {
    workspaceId: '85555555-5555-4555-8555-555555555555',
    actorId: '95555555-5555-4555-8555-555555555555',
  });
  const assessment = await createAssessmentViaApi(workspaceA, makeAssessmentInput());

  const workspaceB = await setAssessmentCreatorContext(page, {
    workspaceId: '86666666-6666-4666-8666-666666666666',
    actorId: '96666666-6666-4666-8666-666666666666',
  });

  await page.goto(`/assessments/${assessment.id}`);
  await expect(page.locator(assessmentE2ESelectors.assessmentErrorState)).toBeVisible();

  await expect(getAssessmentViaApi(workspaceB, assessment.id)).rejects.toThrow();
  await expect(archiveAssessmentViaApi(workspaceB, assessment.id)).rejects.toThrow();
});
