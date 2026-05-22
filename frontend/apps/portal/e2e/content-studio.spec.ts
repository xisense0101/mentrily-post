import { expect, test, type Page } from '@playwright/test';
import { clearContentE2EContext, setContentCreatorContext } from './helpers/content-e2e-context';
import { makeContentDocumentInput } from './helpers/content-e2e-data';
import { contentE2ESelectors } from './helpers/content-e2e-selectors';

async function createDocumentThroughUi(page: Page, title: string) {
  await page.goto('/content/documents');
  await expect(page.locator(contentE2ESelectors.documentsPage)).toBeVisible();
  await page.locator(contentE2ESelectors.titleInput).fill(title);
  await page.locator(contentE2ESelectors.purposeSelect).selectOption('GENERAL_PAGE');
  await page.locator(contentE2ESelectors.createSubmit).click();
}

async function openCreatedDocument(page: Page, title: string) {
  const createdCard = page
    .locator(contentE2ESelectors.documentCard)
    .filter({ hasText: title })
    .first();

  await expect(createdCard).toBeVisible();
  await createdCard.click();
  await expect(page.locator(contentE2ESelectors.editorPage)).toBeVisible();
}

async function publishDocumentThroughUi(page: Page): Promise<void> {
  await page.locator(contentE2ESelectors.addParagraphButton).click();
  await page.locator(contentE2ESelectors.paragraphEditor).fill('E2E paragraph block content');

  const savePromise = page.waitForResponse((res) => res.url().includes('/blocks') && res.ok());
  await page.locator(contentE2ESelectors.saveBlocksButton).click();
  await savePromise;

  const publishPromise = page.waitForResponse((res) => res.url().includes('/publish') && res.ok());
  await page.locator(contentE2ESelectors.publishButton).click();
  await publishPromise;

  await expect(page.getByText(/Status PUBLISHED/)).toBeVisible();
}

test('creator creates and publishes a content document through the real UI and backend', async ({
  page,
}) => {
  const documentInput = makeContentDocumentInput();

  await setContentCreatorContext(page);
  await createDocumentThroughUi(page, documentInput.title);
  await openCreatedDocument(page, documentInput.title);
  await publishDocumentThroughUi(page);
  await expect(page.getByText('Draft blocks: 1')).toBeVisible();
  await expect(page.getByText(/Latest published timestamp:/)).toBeVisible();
});

test('creator archives and restores a content document', async ({ page }) => {
  const documentInput = makeContentDocumentInput();

  await setContentCreatorContext(page);
  await createDocumentThroughUi(page, documentInput.title);
  await openCreatedDocument(page, documentInput.title);
  await publishDocumentThroughUi(page);

  const archivePromise = page.waitForResponse((res) => res.url().includes('/archive') && res.ok());
  await page.locator(contentE2ESelectors.archiveButton).click();
  await archivePromise;

  await expect(page.getByText(/Status ARCHIVED/)).toBeVisible();
  const restoreBtn = page.locator(contentE2ESelectors.restoreButton);
  await expect(restoreBtn).toBeVisible();

  // Click restore
  const restorePromise = page.waitForResponse((res) => res.url().includes('/restore') && res.ok());
  await page.locator(contentE2ESelectors.restoreButton).click();
  await restorePromise;

  // The button should now be enabled after restore returns
  await expect(page.locator(contentE2ESelectors.saveBlocksButton)).toBeEnabled();
});

test('missing request context fails gracefully', async ({ page }) => {
  await clearContentE2EContext(page);
  await page.goto('/content/documents');

  await expect(page.locator(contentE2ESelectors.errorState)).toBeVisible();
});

test('cross-workspace access to another workspace content document is blocked', async ({
  page,
}) => {
  const documentInput = makeContentDocumentInput();

  await setContentCreatorContext(page);
  await createDocumentThroughUi(page, documentInput.title);
  await openCreatedDocument(page, documentInput.title);
  await publishDocumentThroughUi(page);
  const documentId = page.url().split('/').pop();
  expect(documentId).toBeTruthy();

  await setContentCreatorContext(page, {
    workspaceId: '86666666-6666-4666-8666-666666666666',
    actorId: '87777777-7777-4777-8777-777777777777',
  });
  await page.goto(`/content/documents/${documentId!}`);

  await expect(page.locator(contentE2ESelectors.errorState)).toBeVisible();
});
