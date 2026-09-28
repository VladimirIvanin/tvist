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
    await page.getByTestId('slider-loop').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => {
      const root = document.querySelector<HTMLElement & { tvistInstance?: Tvist }>(
        '[data-testid="slider-loop"]'
      );
      return root?.tvistInstance?._isVisible;
    });
  });

  for (const direction of ['prev', 'next'] as const) {
    test(`быстрые клики ${direction} сохраняют видимые слайды и работу autoplay`, async ({ page }) => {
      const result = await page.evaluate(async (direction) => {
        const root = document.querySelector<HTMLElement & { tvistInstance?: Tvist }>(
          '[data-testid="slider-loop"]'
        )!;
        const slider = root.tvistInstance!;
        const pagination = document.createElement('div');
        pagination.className = 'tvist-v1__pagination';
        root.appendChild(pagination);
        slider.updateOptions({
          perPage: 1,
          loop: true,
          speed: 300,
          autoplay: { delay: 2600, pauseOnHover: true },
          arrows: true,
          pagination: true,
        });
        root.dispatchEvent(new MouseEvent('mouseenter'));
        const button = root.querySelector<HTMLElement>(`.tvist-v1__arrow--${direction}`)!;
        let completed = 0;
        let checkedFrames = 0;
        let uncoveredFrames = 0;
        let watching = true;
        slider.on('transitionEnd', () => { completed += 1; });

        const checkCoverage = () => {
          if (!watching) return;
          const track = slider.track.getBoundingClientRect();
          const bounds = slider.slides.map((slide) => slide.getBoundingClientRect());
          if (
            Math.min(...bounds.map((rect) => rect.left)) > track.left + 1 ||
            Math.max(...bounds.map((rect) => rect.right)) < track.right - 1
          ) {
            uncoveredFrames += 1;
          }
          checkedFrames += 1;
          requestAnimationFrame(checkCoverage);
        };
        requestAnimationFrame(checkCoverage);

        for (let i = 0; i < 60; i += 1) {
          button.click();
          await new Promise(resolve => setTimeout(resolve, 20));
        }
        const completedDuringClicks = completed;
        await new Promise(resolve => setTimeout(resolve, 400));
        const settled = !slider.engine.animator.isAnimating();
        const rendered = new DOMMatrixReadOnly(getComputedStyle(slider.container).transform).m41;
        const target = slider.engine.target.get();
        const index = slider.realIndex;
        const activeBullet = root.querySelector('.tvist-v1__bullet--active');
        const bullets = [...root.querySelectorAll('.tvist-v1__bullet')];
        const paginationMatches = bullets.indexOf(activeBullet!) === index;

        root.dispatchEvent(new MouseEvent('mouseleave'));
        await new Promise(resolve => setTimeout(resolve, 3100));
        watching = false;
        return {
          checkedFrames, uncoveredFrames, completedDuringClicks, settled, rendered, target,
          paginationMatches,
          autoplayResumed: slider.realIndex === (index + 1) % slider.originalSlideCount,
        };
      }, direction);

      expect(result.checkedFrames).toBeGreaterThan(0);
      expect(result.uncoveredFrames).toBe(0);
      expect(result.completedDuringClicks).toBeGreaterThan(0);
      expect(result.settled).toBe(true);
      expect(result.rendered).toBeCloseTo(result.target, 0);
      expect(result.paginationMatches).toBe(true);
      expect(result.autoplayResumed).toBe(true);
    });
  }

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
      const animations: number[] = [];
      const remainingDistances: number[] = [];
      const directions = ['next', 'next', 'next', 'next', 'next', 'prev', 'prev', 'prev', 'prev', 'prev'] as const;
      for (const direction of directions) {
        slider[direction]();
        indices.push(slider.realIndex);
        transitions.push(container.style.transition);
        await new Promise(resolve => setTimeout(resolve, 60));
        animations.push(container.getAnimations().length);
        const rendered = new DOMMatrixReadOnly(getComputedStyle(container).transform).m41;
        remainingDistances.push(Math.abs(rendered - slider.engine.target.get()));
        await new Promise(resolve => setTimeout(resolve, 160));
      }
      return { indices, transitions, animations, remainingDistances, animating: slider.engine.animator.isAnimating() };
    });

    expect(result.indices).toEqual([1, 2, 0, 1, 2, 1, 0, 2, 1, 0]);
    expect(result.transitions.every(value => value.includes('transform 180ms'))).toBe(true);
    expect(result.animations).toEqual(Array(10).fill(1));
    expect(result.remainingDistances.every(distance => distance > 1)).toBe(true);
    expect(result.animating).toBe(false);
  });
});
