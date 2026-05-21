import { expect, test } from '@playwright/test';
import {
  addLessonViaApi,
  addSectionViaApi,
  createCourseViaApi,
  publishCourseViaApi,
} from './helpers/learning-api-e2e-client';
import {
  clearE2EContext,
  setCreatorContext,
  setLearnerContext,
} from './helpers/learning-e2e-context';
import { makeCourseInput, makeLessonInput, makeSectionInput } from './helpers/learning-e2e-data';
import { learningE2ESelectors } from './helpers/learning-e2e-selectors';

test('creator creates and publishes a course through the real UI and backend', async ({ page }) => {
  const courseInput = makeCourseInput();

  await setCreatorContext(page);
  await page.goto('/learning/courses');

  await expect(page.locator(learningE2ESelectors.creatorPage)).toBeVisible();
  await page.locator(learningE2ESelectors.courseTitleInput).first().fill(courseInput.title);
  await page.locator(learningE2ESelectors.courseSlugInput).fill(courseInput.slug);
  await page
    .locator(learningE2ESelectors.courseDescriptionInput)
    .first()
    .fill(courseInput.description ?? '');
  await page.locator(learningE2ESelectors.courseCreateSubmit).click();

  const createdCourseCard = page
    .locator(learningE2ESelectors.courseListCard)
    .filter({ hasText: courseInput.title })
    .first();

  await expect(createdCourseCard).toBeVisible();
  await createdCourseCard.click();

  await expect(page.locator(learningE2ESelectors.courseDetailPage).first()).toBeVisible();
  await page.locator(learningE2ESelectors.sectionTitleInput).fill(makeSectionInput().title);
  await page.locator(learningE2ESelectors.sectionCreateSubmit).click();
  await expect(
    page.getByRole('heading', { name: makeSectionInput().title, exact: true }),
  ).toBeVisible();

  const lessonInput = makeLessonInput();
  await page.locator(learningE2ESelectors.lessonTitleInput).fill(lessonInput.title);
  await page.locator(learningE2ESelectors.lessonCreateSubmit).click();
  await expect(page.getByText(lessonInput.title)).toBeVisible();

  await page.locator(learningE2ESelectors.coursePublishButton).click();
  await expect(page.getByText('PUBLISHED', { exact: true })).toBeVisible();
});

test('learner enrolls, completes lesson progress, and completes enrollment', async ({ page }) => {
  const creatorContext = await setCreatorContext(page);
  const course = await createCourseViaApi(creatorContext, makeCourseInput());
  const courseWithSection = await addSectionViaApi(creatorContext, course.id, makeSectionInput());
  const sectionId = courseWithSection.sections[0]?.id;

  expect(sectionId).toBeTruthy();

  await addLessonViaApi(creatorContext, course.id, sectionId!, makeLessonInput());
  await publishCourseViaApi(creatorContext, course.id);

  await setLearnerContext(page);
  await page.goto('/learning/enrollments');

  await expect(page.locator(learningE2ESelectors.learnerPage)).toBeVisible();
  await page.locator(learningE2ESelectors.enrollmentCourseIdInput).fill(course.id);
  await page.locator(learningE2ESelectors.enrollmentSubmit).click();

  const enrollmentCard = page
    .locator(learningE2ESelectors.enrollmentCard)
    .filter({ hasText: course.id })
    .first();

  await expect(enrollmentCard).toBeVisible();
  await enrollmentCard.locator(learningE2ESelectors.enrollmentSelectButton).click();

  await expect(page.getByText(course.title)).toBeVisible();
  await page.locator(learningE2ESelectors.lessonProgressCompleteButton).first().click();
  await expect(page.getByRole('button', { name: 'Completed', exact: true })).toBeVisible();

  await page.locator(learningE2ESelectors.enrollmentCompleteButton).click();
  await expect(
    page.locator(learningE2ESelectors.enrollmentCard).first().getByText('Status: COMPLETED'),
  ).toBeVisible();
});

test('missing request context fails gracefully', async ({ page }) => {
  await clearE2EContext(page);
  await page.goto('/learning/courses');

  await expect(page.locator(learningE2ESelectors.learningErrorState)).toBeVisible();
});

test('cross-workspace access to another workspace course detail is blocked', async ({ page }) => {
  const creatorContext = await setCreatorContext(page, {
    workspaceId: '55555555-5555-4555-8555-555555555555',
  });
  const course = await createCourseViaApi(creatorContext, makeCourseInput());

  await setCreatorContext(page, {
    workspaceId: '66666666-6666-4666-8666-666666666666',
    actorId: '77777777-7777-4777-8777-777777777777',
  });
  await page.goto(`/learning/courses/${course.id}`);

  await expect(page.locator(learningE2ESelectors.learningErrorState)).toBeVisible();
});
