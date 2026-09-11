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
      // Dev-only auto-complete button; it is CSS-hidden (Tailwind `hidden`) even in
      // dev builds, so it must be triggered via a dispatched event, not a real click.
      await page.locator('[data-auto-complete="true"]').dispatchEvent('click');
      return;
    }
    default:
      throw new Error(`unknown exercise kind: ${kind}`);
  }
}

test('complete Unit 1 then review due cards', async ({ page }) => {
  // --- Setup: enter passphrase ---
  await page.goto('/');
  await page.waitForURL('/setup');
  await page.getByLabel('Passphrase').fill('test-passphrase');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.waitForURL('/');

  // --- Learn Unit 1, lesson 1 ---
  await page.getByRole('link', { name: /^Unit 1/ }).click();
  await page.getByTestId('lesson-0').click();
  await page.getByRole('link', { name: 'Start practice' }).click();

  // --- Practice: solve all exercises ---
  for (let i = 0; i < 60; i++) {
    if (await page.getByTestId('results').isVisible()) break;
    await expect(page.getByTestId('exercise')).toBeVisible();
    await answerCurrent(page);
    await page.getByRole('button', { name: 'Continue' }).click();
  }
  await expect(page.getByTestId('results')).toBeVisible({ timeout: 10_000 });

  // --- Navigate back and verify Review button ---
  // Lesson 1 of 2 isn't the last lesson, so results links to the unit screen.
  await page.getByRole('link', { name: 'Next lesson' }).click();
  await expect(page.getByRole('heading', { name: 'Unit 1' })).toBeVisible();
  await page.getByRole('link', { name: 'Back to path' }).click();
  await page.waitForURL('/');
  await expect(page.getByTestId('review-button')).toBeVisible({ timeout: 10_000 });

  // --- Start review ---
  await page.getByTestId('review-button').click();
  await page.waitForURL('/review');

  // --- Solve review exercises (multiple-choice and write-it) ---
  for (let i = 0; i < 60; i++) {
    const exerciseEl = page.getByTestId('exercise');
    if (!(await exerciseEl.isVisible({ timeout: 2000 }).catch(() => false))) break;

    const kind = await exerciseEl.getAttribute('data-kind');

    if (kind === 'write-it') {
      // Review write-it cards render with showOutline: false, so the visible
      // "Show me" dev button is available; fall back to the hidden auto-complete
      // button (forced) if it isn't.
      const showBtn = page.locator('[data-show-answer="true"]');
      if (await showBtn.isVisible().catch(() => false)) {
        await showBtn.click();
      } else {
        await page.locator('[data-auto-complete="true"]').dispatchEvent('click');
      }
      // Grade selector appears next: click Continue (defaults to the suggested grade).
      const gradeContBtn = page.getByRole('button', { name: 'Continue' });
      await expect(gradeContBtn).toBeVisible({ timeout: 2000 });
      await gradeContBtn.click();
    } else {
      await exerciseEl.locator('[data-correct="true"]').click();
    }

    const continueBtn = page.getByRole('button', { name: 'Continue' });
    if (await continueBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await continueBtn.click();
    }

    if (await page.getByTestId('review-results').isVisible({ timeout: 500 }).catch(() => false)) {
      break;
    }
  }

  // --- Verify review results ---
  await expect(page.getByTestId('review-results')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText('Review complete')).toBeVisible();
});
