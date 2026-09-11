import { expect, test, type Page } from '@playwright/test';

async function answerCurrent(page: Page): Promise<void> {
  const ex = page.getByTestId('exercise');
  const kind = await ex.getAttribute('data-kind');
  switch (kind) {
    case 'multiple-choice':
    case 'listen-pick':
    case 'fill-blank':
      await ex.locator('[data-correct="true"]').click();
      return;
    case 'sentence-builder': {
      const n = await ex.locator('[data-answer-index]').count();
      for (let i = 0; i < n; i++) await ex.locator(`[data-answer-index="${i}"]`).click();
      await page.getByRole('button', { name: 'Check' }).click();
      return;
    }
    case 'match-pairs': {
      const n = await ex.locator('[data-pair-left]').count();
      for (let i = 0; i < n; i++) {
        await ex.locator(`[data-pair-left="${i}"]`).click();
        await ex.locator(`[data-pair-right="${i}"]`).click();
      }
      return;
    }
    case 'write-it': {
      await ex.locator('[data-auto-complete="true"]').dispatchEvent('click');
      return;
    }
    default:
      throw new Error(`unknown exercise kind: ${kind}`);
  }
}

async function advanceThroughLesson(page: Page): Promise<void> {
  for (let i = 0; i < 120; i++) {
    if (await page.getByTestId('results').isVisible()) break;

    // If an exercise is visible, answer it
    const exerciseVisible = await page.getByTestId('exercise').isVisible().catch(() => false);
    if (exerciseVisible) {
      await answerCurrent(page);
      await page.getByRole('button', { name: 'Continue' }).click();
      continue;
    }

    // Otherwise it's an intro slide — click Continue to advance
    const continueBtn = page.getByRole('button', { name: 'Continue' });
    if (await continueBtn.isVisible().catch(() => false)) {
      await continueBtn.click();
      continue;
    }

    // Safety: if neither is visible, wait briefly
    await page.waitForTimeout(200);
  }
}

test('a fresh device sets up, learns Unit 1 via sub-lessons, and syncs', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/setup$/);
  await page.getByLabel('Passphrase').fill('test-passphrase');
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByRole('heading', { name: 'HSK 1' })).toBeVisible();
  await expect(page.getByTestId('unit-l1-u01')).toHaveAttribute('data-state', 'available');
  await expect(page.getByTestId('unit-l1-u02')).toHaveAttribute('data-state', 'locked');
  await expect(page.getByTestId('sync-status')).toHaveText('Synced');

  // Enter unit -> see lesson picker
  await page.getByRole('link', { name: /^Unit 1/ }).click();
  await expect(page.getByRole('heading', { name: 'Unit 1' })).toBeVisible();

  // Count lessons and complete each one
  const lessonCount = await page.locator('[data-testid^="lesson-"]').count();
  expect(lessonCount).toBeGreaterThanOrEqual(1);

  for (let li = 0; li < lessonCount; li++) {
    // Click the lesson
    await page.getByTestId(`lesson-${li}`).click();

    // Advance through the unified slide flow (intros + exercises)
    await advanceThroughLesson(page);
    await expect(page.getByTestId('results')).toBeVisible();

    const isLastLesson = li === lessonCount - 1;
    if (isLastLesson) {
      await page.getByRole('link', { name: 'Back to path' }).click();
    } else {
      await page.getByRole('link', { name: 'Next lesson' }).click();
      await expect(page.getByRole('heading', { name: 'Unit 1' })).toBeVisible();
      await expect(page.getByTestId(`lesson-${li}`)).toHaveAttribute('data-done', 'true');
    }
  }

  // After completing all lessons, verify the unit is complete on the path
  await expect(page.getByTestId('unit-l1-u01')).toHaveAttribute('data-state', 'completed');
  await expect(page.getByTestId('unit-l1-u02')).toHaveAttribute('data-state', 'available');
  await expect(page.getByTestId('sync-status')).toHaveText('Synced');

  // The progress reached the Worker: a second browser context with the same passphrase pulls it.
  const other = await page.context().browser()!.newContext();
  const page2 = await other.newPage();
  await page2.goto('/');
  await page2.getByLabel('Passphrase').fill('test-passphrase');
  await page2.getByRole('button', { name: 'Continue' }).click();
  await expect(page2.getByTestId('unit-l1-u01')).toHaveAttribute('data-state', 'completed');
  await other.close();
});
