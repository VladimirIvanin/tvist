import { test, expect } from '@playwright/test';
import { getActiveSlideIndex, waitForRealIndex, waitForSliderReady } from './helpers';

test.describe('Basic slider', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForSliderReady(page, 'slider-basic');
  });

  test('инициализируется с первым слайдом', async ({ page }) => {
    const slider = page.getByTestId('slider-basic');

    await expect(slider).toHaveClass(/tvist-v1--created/);
    await expect(page.getByTestId('basic-real-index')).toHaveText('0');
    expect(await getActiveSlideIndex(page, 'slider-basic')).toBe(0);
  });

  test('переключает слайды стрелками', async ({ page }) => {
    const slider = page.getByTestId('slider-basic');

    await slider.locator('.tvist-v1__arrow--next').click();
    await waitForRealIndex(page, 'basic-real-index', 1);
    expect(await getActiveSlideIndex(page, 'slider-basic')).toBe(1);

    await slider.locator('.tvist-v1__arrow--prev').click();
    await waitForRealIndex(page, 'basic-real-index', 0);
    expect(await getActiveSlideIndex(page, 'slider-basic')).toBe(0);
  });

  test('переключает слайды через pagination', async ({ page }) => {
    const slider = page.getByTestId('slider-basic');
    const bullets = slider.locator('.tvist-v1__bullet');

    await expect(bullets).toHaveCount(5);
    await bullets.nth(2).click();
    await waitForRealIndex(page, 'basic-real-index', 2);
    expect(await getActiveSlideIndex(page, 'slider-basic')).toBe(2);
  });

  test('переключает слайд drag', async ({ page }) => {
    const track = page.getByTestId('slider-basic').locator('.tvist-v1__track');
    const box = await track.boundingBox();
    expect(box).not.toBeNull();

    await page.mouse.move(box!.x + box!.width * 0.8, box!.y + box!.height / 2);
    await page.mouse.down();
    await page.mouse.move(box!.x + box!.width * 0.2, box!.y + box!.height / 2, { steps: 10 });
    await page.mouse.up();

    await waitForRealIndex(page, 'basic-real-index', 1);
    expect(await getActiveSlideIndex(page, 'slider-basic')).toBe(1);
  });
});

test.describe('Loop slider', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForSliderReady(page, 'slider-loop');
  });

  test('переходит с последнего слайда на первый', async ({ page }) => {
    const slider = page.getByTestId('slider-loop');
    const next = slider.locator('.tvist-v1__arrow--next');

    await next.click();
    await waitForRealIndex(page, 'loop-real-index', 1);

    await next.click();
    await waitForRealIndex(page, 'loop-real-index', 2);

    await next.click();
    await waitForRealIndex(page, 'loop-real-index', 0);
    expect(await getActiveSlideIndex(page, 'slider-loop')).toBe(0);
  });
});
