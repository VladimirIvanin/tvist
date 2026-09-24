import { test, expect } from '@playwright/test';
import type { Tvist } from '../src/core/Tvist';
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

    const startX = box!.x + box!.width * 0.8;
    const endX = box!.x + box!.width * 0.2;
    const y = box!.y + box!.height / 2;
    const steps = 10;

    await page.mouse.move(startX, y);
    await page.mouse.down();
    for (let step = 1; step <= steps; step += 1) {
      const progress = step / steps;
      await page.mouse.move(startX + (endX - startX) * progress, y);
      await page.waitForTimeout(16);
    }
    await page.mouse.up();

    await page.waitForFunction(() =>
      Number(document.querySelector('[data-testid="basic-real-index"]')?.textContent) > 0
    );
    expect(await getActiveSlideIndex(page, 'slider-basic')).toBeGreaterThan(0);
  });

  test('CSS-переход движется без покадровых записей и прерывается в текущей точке', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const root = document.querySelector<HTMLElement & { tvistInstance?: Tvist }>(
        '[data-testid="slider-basic"]'
      )!;
      const slider = root.tvistInstance!;
      const container = root.querySelector<HTMLElement>('.tvist-v1__container')!;
      slider.updateOptions({ speed: 600 });

      let styleWrites = 0;
      let ends = 0;
      const observer = new MutationObserver((records) => { styleWrites += records.length; });
      observer.observe(container, { attributes: true, attributeFilter: ['style'] });
      slider.on('transitionEnd', () => { ends += 1; });

      const position = () => new DOMMatrixReadOnly(getComputedStyle(container).transform).m41;
      slider.scrollTo(1);
      await new Promise(resolve => setTimeout(resolve, 120));
      const middle = position();
      const target = slider.engine.target.get();
      const writesDuringTransition = styleWrites;
      slider.engine.animator.stop();
      const frozen = position();
      slider.scrollTo(2);
      await new Promise(resolve => setTimeout(resolve, 80));
      let midEvents = 0;
      const onScroll = () => { midEvents += 1; };
      slider.on('scroll', onScroll);
      await new Promise(resolve => setTimeout(resolve, 80));
      slider.off('scroll', onScroll);
      const eventsAfterOff = midEvents;
      await new Promise(resolve => setTimeout(resolve, 600));
      observer.disconnect();
      return {
        middle, target, frozen, writesDuringTransition, ends, midEvents, eventsAfterOff,
        final: position(), finalTarget: slider.engine.target.get(),
        animating: slider.engine.animator.isAnimating(),
      };
    });

    expect(result.middle).toBeLessThan(-1);
    expect(result.middle).toBeGreaterThan(result.target + 1);
    expect(result.writesDuringTransition).toBeLessThanOrEqual(3);
    expect(Math.abs(result.frozen - result.middle)).toBeLessThan(5);
    expect(result.midEvents).toBeGreaterThan(0);
    expect(result.midEvents).toBe(result.eventsAfterOff);
    expect(result.final).toBeCloseTo(result.finalTarget, 0);
    expect(result.ends).toBe(1);
    expect(result.animating).toBe(false);
  });

  test('изменение геометрии останавливает текущий CSS-переход', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const root = document.querySelector<HTMLElement & { tvistInstance?: Tvist }>(
        '[data-testid="slider-basic"]'
      )!;
      const slider = root.tvistInstance!;
      slider.updateOptions({ speed: 600 });
      slider.scrollTo(1);
      await new Promise(resolve => setTimeout(resolve, 100));
      slider.updateOptions({ direction: 'vertical' });
      return {
        animating: slider.engine.animator.isAnimating(),
        transition: slider.container.style.transition,
        location: slider.engine.location.get(),
      };
    });

    expect(result.animating).toBe(false);
    expect(result.transition).toBe('');
    expect(Number.isFinite(result.location)).toBe(true);
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

  test('сохраняет CSS-переход при перестановке слайдов в loop', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const root = document.querySelector<HTMLElement & { tvistInstance?: Tvist }>(
        '[data-testid="slider-loop"]'
      )!;
      const slider = root.tvistInstance!;
      slider.updateOptions({ speed: 180 });
      const container = root.querySelector<HTMLElement>('.tvist-v1__container')!;
      const indices: number[] = [];
      const transitions: string[] = [];
      for (let i = 0; i < 5; i++) {
        slider.next();
        indices.push(slider.realIndex);
        transitions.push(container.style.transition);
        await new Promise(resolve => setTimeout(resolve, 220));
      }
      return { indices, transitions, animating: slider.engine.animator.isAnimating() };
    });

    expect(result.indices).toEqual([1, 2, 0, 1, 2]);
    expect(result.transitions.every(value => value.includes('transform 180ms'))).toBe(true);
    expect(result.animating).toBe(false);
  });
});
