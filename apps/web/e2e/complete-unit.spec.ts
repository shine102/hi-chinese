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
    default:
      throw new Error(`unknown exercise kind: ${kind}`);
  }
}

test('a fresh device sets up, learns and completes Unit 1, and syncs', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/setup$/);
  await page.getByLabel('Passphrase').fill('test-passphrase');
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByRole('heading', { name: 'HSK 1' })).toBeVisible();
  await expect(page.getByTestId('unit-l1-u01')).toHaveAttribute('data-state', 'available');
  await expect(page.getByTestId('unit-l1-u02')).toHaveAttribute('data-state', 'locked');
  await expect(page.getByTestId('sync-status')).toHaveText('Synced');

  await page.getByRole('link', { name: /^Unit 1/ }).click();
  await expect(page.getByRole('heading', { name: 'Unit 1' })).toBeVisible();
  await page.getByRole('link', { name: 'Learn' }).click();
  await expect(page.getByRole('heading', { name: 'Unit 1: Learn' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'New words' })).toBeVisible();
  await page.getByRole('link', { name: 'Start practice' }).click();

  for (let i = 0; i < 60; i++) {
    if (await page.getByTestId('results').isVisible()) break;
    await expect(page.getByTestId('exercise')).toBeVisible();
    await answerCurrent(page);
    await page.getByRole('button', { name: 'Continue' }).click();
  }
  await expect(page.getByTestId('results')).toBeVisible();
  await expect(page.getByTestId('results')).toContainText('100%');

  await page.getByRole('link', { name: 'Back to path' }).click();
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
