import { expect, test } from '@playwright/test';
import {
  mountRegressionSlider,
  trackPosition,
  type RegressionWindow,
} from './fixtures/interaction-regressions';

test('height-only viewport resize preserves an active drag', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 700 });
  await mountRegressionSlider(page);
  await page.mouse.move(300, 60);
  await page.mouse.down();
  await page.mouse.move(290, 60);
  await page.mouse.move(220, 60);
  const before = await trackPosition(page);
  await page.setViewportSize({ width: 900, height: 600 });
  await page.waitForTimeout(180);
  expect(await trackPosition(page)).toBeCloseTo(before, 0);
  await page.mouse.move(190, 60);
  expect(await trackPosition(page)).toBeCloseTo(before - 30, 0);
  await page.mouse.up();
});

test('native touch allows vertical page scroll after horizontal swipes', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'CDP supplies native touch input in Chromium only.');
  await page.setViewportSize({ width: 390, height: 700 });
  await mountRegressionSlider(page);
  await page.evaluate(() => {
    document.body.style.height = '2400px';
    document.querySelector<HTMLElement>('#host')!.style.cssText = 'width:100%;padding-top:140px';
    document.querySelector<HTMLElement>('#regression-slider')!.style.width = '100%';
    (window as unknown as RegressionWindow).regressionSlider.update();
  });
  const cdp = await page.context().newCDPSession(page);
  const swipe = async (vertical: boolean) => {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: 300, y: 200 }],
    });
    for (let step = 1; step <= 6; step++) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [
          {
            x: vertical ? 300 : 300 - step * 25,
            y: vertical ? 200 - step * 20 : 200,
          },
        ],
      });
      await page.waitForTimeout(20);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };
  for (let i = 0; i < 3; i++) await swipe(false);
  expect(
    await page.evaluate(() => (window as unknown as RegressionWindow).regressionSlider.realIndex)
  ).toBeGreaterThan(0);
  await swipe(true);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(30);
  await cdp.detach();
});

for (const phase of ['pending', 'active']) {
  test(`disabling drag cancels a ${phase} gesture and allows a fresh gesture`, async ({ page }) => {
    await mountRegressionSlider(page);
    await page.mouse.move(300, 30);
    await page.mouse.down();
    await page.mouse.move(phase === 'active' ? 290 : 297, 30);
    if (phase === 'active') await page.mouse.move(200, 30);
    await page.evaluate(() =>
      (window as unknown as RegressionWindow).regressionSlider.updateOptions({ drag: false })
    );
    await page.mouse.move(80, 30);
    await page.mouse.up();
    expect(await trackPosition(page)).toBe(0);
    await expect(page.locator('#regression-slider')).not.toHaveClass(/--dragging/);
    await page.evaluate(() =>
      (window as unknown as RegressionWindow).regressionSlider.updateOptions({ drag: true })
    );
    await page.mouse.move(300, 30);
    await page.mouse.down();
    await page.mouse.move(290, 30);
    await page.mouse.move(100, 30);
    await page.mouse.up();
    expect(
      await page.evaluate(() => (window as unknown as RegressionWindow).regressionSlider.realIndex)
    ).toBeGreaterThan(0);
  });
}

for (const loop of [true, { withClones: true }]) {
  test(`cancellation snaps the selected real slide in loop ${JSON.stringify(loop)}`, async ({
    page,
  }) => {
    await mountRegressionSlider(page, { loop, perPage: 1 });
    await page.evaluate(() =>
      (window as unknown as RegressionWindow).regressionSlider.scrollTo(3, true)
    );
    await page.mouse.move(300, 60);
    await page.mouse.down();
    await page.mouse.move(290, 60);
    await page.mouse.move(240, 60);
    const result = await page.evaluate(() => {
      const slider = (window as unknown as RegressionWindow).regressionSlider;
      slider.updateOptions({ drag: false });
      return {
        index: slider.realIndex,
        error:
          slider.slides[slider.activeIndex]!.getBoundingClientRect().left -
          slider.track.getBoundingClientRect().left,
      };
    });
    await page.mouse.up();
    expect(result.index).toBe(3);
    expect(Math.abs(result.error)).toBeLessThan(1);
  });
}

test('cancelling an active drag resumes paused autoplay', async ({ page }) => {
  await mountRegressionSlider(page, {
    loop: true,
    autoplay: { delay: 500, pauseOnHover: false, pauseOnFocus: false },
  });
  await page.mouse.move(300, 60);
  await page.mouse.down();
  await page.mouse.move(290, 60);
  await page.mouse.move(240, 60);
  await page.evaluate(() =>
    (window as unknown as RegressionWindow).regressionSlider.updateOptions({ drag: false })
  );
  await page.mouse.up();
  const before = await page.evaluate(
    () => (window as unknown as RegressionWindow).regressionSlider.realIndex
  );
  await expect
    .poll(() =>
      page.evaluate(() => (window as unknown as RegressionWindow).regressionSlider.realIndex)
    )
    .not.toBe(before);
});

for (const scale of [0.5, 1.5]) {
  for (const autoWidth of [false, true]) {
    test(`scale ${scale} preserves ${autoWidth ? 'auto' : 'fixed'} width alignment`, async ({
      page,
    }) => {
      await mountRegressionSlider(page, { autoWidth, gap: 16 }, { scale });
      const error = await page.evaluate(() => {
        const slider = (window as unknown as RegressionWindow).regressionSlider;
        slider.scrollTo(2, true);
        return (
          slider.slides[2]!.getBoundingClientRect().left - slider.track.getBoundingClientRect().left
        );
      });
      expect(Math.abs(error)).toBeLessThan(1);
    });
  }
  for (const vertical of [false, true]) {
    test(`scale ${scale} ${vertical ? 'vertical' : 'horizontal'} drag follows the pointer`, async ({
      page,
    }) => {
      await mountRegressionSlider(
        page,
        { direction: vertical ? 'vertical' : 'horizontal' },
        { scale, vertical }
      );
      const box = (await page.locator('.tvist-v1__track').boundingBox())!;
      const x = box.x + box.width * 0.7,
        y = box.y + box.height * 0.7;
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x - (vertical ? 0 : 10), y - (vertical ? 10 : 0));
      await page.mouse.move(x - (vertical ? 0 : 70), y - (vertical ? 70 : 0));
      const before = await trackPosition(page, vertical);
      await page.mouse.move(x - (vertical ? 0 : 100), y - (vertical ? 100 : 0));
      expect((await trackPosition(page, vertical)) - before).toBeCloseTo(-30 / scale, 0);
      await page.mouse.up();
    });
  }
}

for (const layout of ['flex', 'grid'] as const) {
  test(`${layout} shrinks the carousel to its column`, async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 700 });
    await mountRegressionSlider(page, {}, { layout });
    const widths = await page.evaluate(() => ({
      root: document.querySelector('#regression-slider')!.getBoundingClientRect().width,
      page: document.documentElement.scrollWidth,
    }));
    expect(widths).toEqual({ root: 400, page: 900 });
  });
}

for (const zoom of [0.8, 1.25]) {
  test(`CSS zoom ${zoom} preserves alignment and drag distance`, async ({ page }) => {
    await mountRegressionSlider(page, { gap: 16 });
    await page.locator('#host').evaluate((el, zoom) => {
      el.style.zoom = String(zoom);
    }, zoom);
    await page.evaluate(() =>
      (window as unknown as RegressionWindow).regressionSlider.scrollTo(2, true)
    );
    const error = await page.evaluate(() => {
      const slider = (window as unknown as RegressionWindow).regressionSlider;
      return (
        slider.slides[2]!.getBoundingClientRect().left - slider.track.getBoundingClientRect().left
      );
    });
    expect(Math.abs(error)).toBeLessThan(1);
    const box = (await page.locator('.tvist-v1__track').boundingBox())!;
    const x = box.x + box.width * 0.7,
      y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x - 10, y);
    await page.mouse.move(x - 40, y);
    const before = await trackPosition(page);
    await page.mouse.move(x - 70, y);
    // roundLengths rounds each transform independently to a CSS pixel.
    expect(Math.abs((await trackPosition(page)) - before + 30 / zoom)).toBeLessThan(1.1);
    await page.mouse.up();
  });
}

test('input range editing does not move the carousel', async ({ page }) => {
  await mountRegressionSlider(page);
  await page.locator('[data-card="0"]').evaluate((el) => {
    el.innerHTML = '<input type="range" min="0" max="100" value="50" style="width:150px">';
  });
  const box = (await page.locator('input').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 10, box.y + box.height / 2, { steps: 4 });
  await page.mouse.up();
  expect(await trackPosition(page)).toBe(0);
  expect(await page.locator('input').inputValue()).not.toBe('50');
});

test('disabling and destroying preserve author tabindex', async ({ page }) => {
  await mountRegressionSlider(page);
  const result = await page.evaluate(() => {
    const slider = (window as unknown as RegressionWindow).regressionSlider;
    const link = slider.slides[6]!.querySelector('a')!;
    link.setAttribute('tabindex', '2');
    slider.disable();
    const disabled = link.getAttribute('tabindex');
    slider.enable();
    slider.destroy();
    return { disabled, destroyed: link.getAttribute('tabindex') };
  });
  expect(result).toEqual({ disabled: '2', destroyed: '2' });
});

test('vertical autoHeight restores CSS height after a breakpoint round trip', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 700 });
  await mountRegressionSlider(
    page,
    {
      direction: 'vertical',
      autoHeight: true,
      breakpoints: { 600: { autoHeight: false, perPage: 1 } },
    },
    { vertical: true }
  );
  const height = () =>
    page.locator('[data-card="0"]').evaluate((el) => el.getBoundingClientRect().height);
  expect(await height()).toBe(120);
  await page.setViewportSize({ width: 500, height: 700 });
  await expect.poll(height).toBe(360);
  await page.setViewportSize({ width: 900, height: 700 });
  await expect.poll(height).toBe(120);
});

test('interval autoplay remains paused while focus is inside the carousel', async ({ page }) => {
  await mountRegressionSlider(page, {
    autoplay: { delay: 250, pauseOnFocus: true, pauseOnHover: false },
    loop: true,
  });
  await page.locator('[data-card="0"] a').focus();
  const before = await page.evaluate(
    () => (window as unknown as RegressionWindow).regressionSlider.realIndex
  );
  await page.waitForTimeout(550);
  expect(
    await page.evaluate(() => (window as unknown as RegressionWindow).regressionSlider.realIndex)
  ).toBe(before);
  await page.locator('[data-card="0"] a').evaluate((el) => (el as HTMLElement).blur());
  await expect
    .poll(() =>
      page.evaluate(() => (window as unknown as RegressionWindow).regressionSlider.realIndex)
    )
    .not.toBe(before);
});

test('showing a native dialog recalculates centered geometry', async ({ page }) => {
  await mountRegressionSlider(page, { center: true, start: 2 }, { dialog: true });
  await page.evaluate(() => document.querySelector<HTMLDialogElement>('#modal')!.showModal());
  await expect
    .poll(() =>
      page.evaluate(() => {
        const slider = (window as unknown as RegressionWindow).regressionSlider;
        const slide = slider.slides[slider.activeIndex]!.getBoundingClientRect();
        const track = slider.track.getBoundingClientRect();
        return Math.abs((slide.left + slide.right - track.left - track.right) / 2);
      })
    )
    .toBeLessThan(1);
});

for (const loop of [true, { withClones: true }]) {
  test(`labels target their own checkbox with loop ${JSON.stringify(loop)}`, async ({ page }) => {
    await mountRegressionSlider(page);
    const result = await page.evaluate((loop) => {
      const context = window as unknown as RegressionWindow;
      context.regressionSlider.destroy();
      document.querySelectorAll('.tvist-v1__slide').forEach((slide, i) => {
        slide.innerHTML = `<input id="choice-${i}" type="checkbox"><label for="choice-${i}">Choice</label>`;
      });
      const slider = (context.regressionSlider = new context.TvistV1('#regression-slider', {
        loop,
        speed: 0,
      }));
      const nodes = [...slider.container.querySelectorAll<HTMLElement>('[id]')];
      const labels = [...slider.container.querySelectorAll<HTMLLabelElement>('label')];
      return {
        unique: new Set(nodes.map((node) => node.id)).size === nodes.length,
        local: labels.every(
          (label) =>
            label.control?.closest('.tvist-v1__slide') === label.closest('.tvist-v1__slide')
        ),
      };
    }, loop);
    expect(result).toEqual({ unique: true, local: true });
  });
}

test('autoWidth restores authored widths after a breakpoint round trip', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 700 });
  await mountRegressionSlider(page, {
    autoWidth: true,
    speed: 0,
    breakpoints: { 600: { autoWidth: false, perPage: 1 } },
  });
  const width = () =>
    page.locator('[data-card="0"]').evaluate((el) => el.getBoundingClientRect().width);
  expect(await width()).toBe(180);
  await page.setViewportSize({ width: 500, height: 700 });
  await expect.poll(width).toBe(600);
  await page.setViewportSize({ width: 900, height: 700 });
  await expect.poll(width).toBe(180);
});

test('loop may be toggled at runtime without disabling arrows', async ({ page }) => {
  await mountRegressionSlider(page, { perPage: 1, arrows: true });
  const index = await page.evaluate(() => {
    const slider = (window as unknown as RegressionWindow).regressionSlider;
    slider.updateOptions({ loop: true });
    slider.scrollTo(6, true);
    slider.next();
    return slider.realIndex;
  });
  expect(index).toBe(0);
  await expect(page.locator('.tvist-v1__arrow--next')).toBeEnabled();
});

test('release above an arrow leaves no sticky drag', async ({ page }) => {
  await mountRegressionSlider(page, { arrows: true });
  await page.mouse.move(300, 60);
  await page.mouse.down();
  await page.mouse.move(290, 60);
  await page.mouse.move(120, 60);
  await page
    .locator('.tvist-v1__arrow--next')
    .evaluate((el) =>
      el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }))
    );
  await page.mouse.up();
  const before = await trackPosition(page);
  await page.mouse.move(260, 60);
  expect(await trackPosition(page)).toBe(before);
  await expect(page.locator('#regression-slider')).not.toHaveClass(/--dragging/);
});
