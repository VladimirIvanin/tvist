import { expect, test } from '@playwright/test';
import type { Tvist } from '../src/core/Tvist';

type ReviewWindow = Window & { TvistV1: typeof Tvist; reviewSlider: Tvist };

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    document
      .querySelectorAll<HTMLElement & { tvistInstance?: Tvist }>('.tvist-v1')
      .forEach((root) => root.tvistInstance?.destroy());
    document.body.innerHTML = `<div id="review-slider" class="tvist-v1" style="width:720px">
      <div class="tvist-v1__track" style="height:360px"><div class="tvist-v1__container">
        ${Array.from({ length: 12 }, (_, index) => `<div class="tvist-v1__slide" style="height:360px;background:salmon">${index}</div>`).join('')}
      </div></div></div>`;
  });
});

test('vertical grid displays the requested page inside the viewport', async ({ page }) => {
  await page.evaluate(() => {
    const context = window as unknown as ReviewWindow;
    context.reviewSlider = new context.TvistV1('#review-slider', {
      direction: 'vertical',
      grid: { rows: 2, cols: 2 },
      gap: 12,
      speed: 0,
    });
  });
  // Wait for the initial ResizeObserver before navigating.
  await page.waitForTimeout(150);
  const result = await page.evaluate(() => {
    const slider = (window as unknown as ReviewWindow).reviewSlider;
    slider.next();
    const viewport = slider.track.getBoundingClientRect();
    const activePage = slider.slides[slider.activeIndex].getBoundingClientRect();
    return {
      index: slider.realIndex,
      cards: slider.slides[slider.activeIndex].textContent,
      top: activePage.top - viewport.top,
      bottom: activePage.bottom - viewport.bottom,
    };
  });
  expect(result.index).toBe(1);
  expect(result.cards).toBe('4567');
  expect(Math.abs(result.top)).toBeLessThan(1);
  expect(Math.abs(result.bottom)).toBeLessThan(1);
});

test('vertical fade overlaps both partially visible slides during animation', async ({ page }) => {
  await page.evaluate(() => {
    const context = window as unknown as ReviewWindow;
    context.reviewSlider = new context.TvistV1('#review-slider', {
      direction: 'vertical',
      effect: 'fade',
      speed: 1000,
    });
  });
  await page.waitForTimeout(150);
  await page.evaluate(() => (window as unknown as ReviewWindow).reviewSlider.next());
  await page.waitForTimeout(240);
  const result = await page.evaluate(() => {
    const slider = (window as unknown as ReviewWindow).reviewSlider;
    const viewport = slider.track.getBoundingClientRect();
    return slider.slides.slice(0, 2).map((slide) => {
      const rect = slide.getBoundingClientRect();
      return {
        opacity: Number(getComputedStyle(slide).opacity),
        x: rect.left - viewport.left,
        y: rect.top - viewport.top,
      };
    });
  });
  for (const slide of result) {
    expect(slide.opacity).toBeGreaterThan(0.05);
    expect(slide.opacity).toBeLessThan(0.95);
    expect(Math.abs(slide.x)).toBeLessThan(1);
    expect(Math.abs(slide.y)).toBeLessThan(1);
  }
});

test('cloned loop keeps the selected original across disabling and enabling', async ({ page }) => {
  const result = await page.evaluate(() => {
    const context = window as unknown as ReviewWindow;
    const slider = new context.TvistV1('#review-slider', { loop: { withClones: true }, speed: 0 });
    slider.scrollTo(5, true);
    slider.disable();
    slider.enable();
    const restored = slider.realIndex;
    slider.scrollTo(1, true);
    const rect = slider.slides[slider.activeIndex].getBoundingClientRect();
    const viewport = slider.track.getBoundingClientRect();
    return {
      restored,
      index: slider.realIndex,
      text: slider.slides[slider.activeIndex].textContent,
      left: rect.left - viewport.left,
      missingIndices: slider.slides.filter((slide) => !slide.hasAttribute('data-tvist-slide-index'))
        .length,
    };
  });
  expect(result).toEqual({ restored: 5, index: 1, text: '1', left: 0, missingIndices: 0 });
});

test('replaced window breakpoints update a fixed-width slider and its pagination', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 800 });
  await page.evaluate(() => {
    const context = window as unknown as ReviewWindow;
    context.reviewSlider = new context.TvistV1('#review-slider', {
      perPage: 3,
      pagination: true,
      breakpoints: { 600: { perPage: 1 } },
    });
  });
  await page.waitForTimeout(150);
  await page.evaluate(() =>
    (window as unknown as ReviewWindow).reviewSlider.updateOptions({
      breakpoints: { 900: { perPage: 2, pagination: { type: 'fraction' } } },
    })
  );
  await page.setViewportSize({ width: 800, height: 800 });
  await expect(page.locator('.tvist-v1__pagination-current')).toHaveText('1');
  expect(
    await page.evaluate(() => (window as unknown as ReviewWindow).reviewSlider.options.perPage)
  ).toBe(2);
  await page.setViewportSize({ width: 1100, height: 800 });
  await expect(page.locator('.tvist-v1__bullet')).toHaveCount(10);
});
