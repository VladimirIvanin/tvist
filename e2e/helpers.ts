import type { Page } from '@playwright/test';

export async function waitForSliderReady(page: Page, testId: string): Promise<void> {
  const root = page.getByTestId(testId);
  await root.waitFor({ state: 'visible' });
  await page.waitForFunction(
    (id) => {
      const el = document.querySelector<HTMLElement>(`[data-testid="${id}"]`);
      return el?.classList.contains('tvist-v1--created') ?? false;
    },
    testId,
  );
}

export async function getActiveSlideIndex(page: Page, testId: string): Promise<number> {
  const activeSlide = page.getByTestId(testId).locator('.tvist-v1__slide--active');
  const index = await activeSlide.getAttribute('data-tvist-slide-index');
  return Number(index ?? 0);
}

export async function waitForRealIndex(page: Page, testId: string, expected: number): Promise<void> {
  await page.getByTestId(testId).waitFor({ state: 'visible' });
  await page.waitForFunction(
    (args) => {
      const el = document.querySelector<HTMLElement>(`[data-testid="${args.displayTestId}"]`);
      return el?.textContent === String(args.expected);
    },
    { displayTestId: testId, expected },
  );
}
