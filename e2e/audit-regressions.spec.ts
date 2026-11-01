import { expect, test, type Page } from '@playwright/test';
import type { Tvist, TvistOptions } from '../src';

type TestWindow = Window & { TvistV1: typeof Tvist; slider: Tvist };
async function mount(page: Page, options: TvistOptions = {}, widths?: number[]) {
  await page.goto('/');
  await page.evaluate(
    ({ options, widths }) => {
      document
        .querySelectorAll<HTMLElement & { tvistInstance?: Tvist }>('.tvist-v1')
        .forEach((root) => root.tvistInstance?.destroy());
      document.body.style.margin = '0';
      document.body.style.padding = '0';
      document.body.innerHTML = `<div id="regression" class="tvist-v1" style="width:600px;height:300px">
      <div class="tvist-v1__track" style="height:300px"><div class="tvist-v1__container">${Array.from(
        { length: widths?.length ?? 9 },
        (_, index) =>
          `<div class="tvist-v1__slide" data-card="${index}" style="height:300px;background:salmon"><button type="button">${index}</button></div>`
      ).join('')}</div></div></div>`;
      if (widths) {
        const style = document.createElement('style');
        style.textContent = widths
          .map((width, index) => `#regression [data-card="${index}"] {width:${width}px}`)
          .join('');
        document.head.append(style);
      }
      const w = window as unknown as TestWindow;
      w.slider = new w.TvistV1('#regression', { speed: 0, visibility: false, ...options });
    },
    { options, widths }
  );
  await page.waitForTimeout(180);
}

async function expectCovered(page: Page, gap = 0) {
  const result = await page.evaluate((gap) => {
    const s = (window as unknown as TestWindow).slider;
    const track = s.track.getBoundingClientRect();
    const intervals = s.slides
      .map((slide) => slide.getBoundingClientRect())
      .sort((a, b) => a.left - b.left);
    let edge = track.left;
    const holes: number[] = [];
    for (const rect of intervals) {
      if (rect.right < edge || rect.left > track.right) continue;
      if (rect.left - edge > gap + 1) holes.push(rect.left - edge);
      edge = Math.max(edge, rect.right);
    }
    if (edge < track.right - gap - 1) holes.push(track.right - edge);
    return {
      holes,
      active: s.slides
        .filter((slide) => slide.classList.contains('tvist-v1__slide--active'))
        .map((slide) => s.slides.indexOf(slide)),
      index: s.activeIndex,
    };
  }, gap);
  expect(result.holes).toEqual([]);
  expect(result.active).toEqual([result.index]);
}

test('004: isolated autoWidth update measures author CSS instead of previous inline sizes', async ({
  page,
}) => {
  const widths = [80, 220, 140, 330, 90];
  await mount(page, { perPage: 3 }, widths);
  await page.evaluate(() =>
    (window as unknown as TestWindow).slider.updateOptions({ autoWidth: true })
  );
  expect(
    await page.evaluate(() =>
      (window as unknown as TestWindow).slider.slides.map(
        (slide) => slide.getBoundingClientRect().width
      )
    )
  ).toEqual(widths);
});

test('021: calc gap matches the physical navigation stride', async ({ page }) => {
  await mount(page, { perPage: 2, gap: 'calc(1rem + 2px)', roundLengths: false });
  const delta = await page.evaluate(() => {
    const s = (window as unknown as TestWindow).slider;
    s.scrollTo(1, true);
    return s.slides[1]!.getBoundingClientRect().left - s.track.getBoundingClientRect().left;
  });
  expect(Math.abs(delta)).toBeLessThan(1);
});

test('030: arrows from a same-origin iframe retain identity and work directly', async ({
  page,
}) => {
  await mount(page);
  const result = await page.evaluate(() => {
    const s = (window as unknown as TestWindow).slider;
    const frame = document.createElement('iframe');
    document.body.append(frame);
    const doc = frame.contentDocument!;
    const prev = doc.createElement('button');
    const next = doc.createElement('button');
    doc.body.append(prev, next);
    s.updateOptions({ arrows: { prev, next } });
    next.click();
    return {
      index: s.realIndex,
      replacements: s.root.querySelectorAll('.tvist-v1__arrow').length,
      parent: next.ownerDocument === doc,
    };
  });
  expect(result).toEqual({ index: 1, replacements: 0, parent: true });
});

for (const options of [{ center: true }, { peek: { left: 24, right: 48 } }]) {
  test(`036: fixedWidth loop covers a distant target ${JSON.stringify(options)}`, async ({
    page,
  }) => {
    await mount(page, { fixedWidth: 170, loop: true, gap: 12, speed: 80, ...options });
    for (const index of [3, 8, 0, 6]) {
      await page.evaluate(
        (index) => (window as unknown as TestWindow).slider.scrollTo(index),
        index
      );
      await page.waitForTimeout(200);
      await expectCovered(page, 12);
      expect(await page.evaluate(() => (window as unknown as TestWindow).slider.realIndex)).toBe(
        index
      );
    }
  });
}

test('027: variable-width loop retains a full buffer after update and seam navigation', async ({
  page,
}) => {
  await mount(
    page,
    { autoWidth: true, loop: true, gap: 12, peek: { left: 24, right: 8 }, roundLengths: false },
    [160, 230, 180, 270, 210]
  );
  for (let i = 0; i < 11; i++) {
    await page.evaluate((i) => {
      const s = (window as unknown as TestWindow).slider;
      if (i < 3) s.update();
      else s.next();
    }, i);
    await expectCovered(page, 12);
  }
});

test('035/038: free drag moves the scrollbar and thumb drag updates selected state', async ({
  page,
}) => {
  await mount(page, { drag: 'free', freeSnap: false, flickPower: 0, scrollbar: true, speed: 80 });
  const track = page.locator('#regression > .tvist-v1__track');
  const rect = (await track.boundingBox())!;
  const thumb = page.locator('.tvist-v1__scrollbar-thumb');
  const initial = (await thumb.boundingBox())!;
  await page.mouse.move(rect.x + 500, rect.y + 100);
  await page.mouse.down();
  await page.mouse.move(rect.x + 480, rect.y + 100);
  await page.mouse.move(rect.x + 170, rect.y + 100, { steps: 8 });
  await page.waitForTimeout(300);
  const held = (await thumb.boundingBox())!;
  expect(held.x - initial.x).toBeGreaterThan(10);
  await page.mouse.up();
  await page.mouse.move(held.x + held.width / 2, held.y + held.height / 2);
  await page.mouse.down();
  await page.mouse.move(held.x + held.width / 2 + 180, held.y + held.height / 2, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(180);
  await expectCovered(page);
  expect(
    await page.evaluate(() => (window as unknown as TestWindow).slider.realIndex)
  ).toBeGreaterThan(1);
});

for (const direction of ['horizontal', 'vertical'] as const) {
  test(`039/040: cube remains rendered and interactive after resize (${direction})`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await mount(page, {
      effect: 'cube',
      direction,
      speed: 1200,
      cubeEffect: { slideShadows: true, perspective: 900 },
    });
    const frames = await page.evaluate(async () => {
      const s = (window as unknown as TestWindow).slider;
      const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      s.next();
      let middle = false;
      for (let i = 0; i < 90; i++) {
        await frame();
        const opacity = [
          ...s.root.querySelectorAll<HTMLElement>('.tvist-v1-slide-shadow-cube'),
        ].map((node) => Number(getComputedStyle(node).opacity));
        if (opacity.some((value) => value > 0.05 && value < 0.95)) {
          middle = true;
          break;
        }
      }
      if (!middle) throw new Error('No measured intermediate cube phase');
      s.root.style.width = '360px';
      s.root.style.height = '240px';
      s.track.style.height = '240px';
      s.update();
      const results = [];
      for (let i = 0; i < 12; i++) {
        await frame();
        const rect = s.track.getBoundingClientRect();
        const hit = document.elementFromPoint(
          rect.left + rect.width / 2,
          rect.top + rect.height / 2
        );
        results.push({
          width: s.slides[s.activeIndex]!.getBoundingClientRect().width,
          hit: !!hit?.closest('.tvist-v1__slide'),
        });
      }
      return results;
    });
    expect(frames.every((frame) => frame.width > 1 && frame.hit)).toBe(true);
    expect(errors).toEqual([]);
  });
}

test('039: switching fade/cube/slide preserves geometry without observer delivery errors', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await mount(page);
  for (const effect of ['fade', 'cube', 'slide'] as const) {
    await page.evaluate((effect) => {
      const s = (window as unknown as TestWindow).slider;
      s.updateOptions({ effect });
      s.scrollTo(2, true);
    }, effect);
    await page.waitForTimeout(180);
  }
  const position = await page.evaluate(() => {
    const s = (window as unknown as TestWindow).slider;
    return s.slides[2]!.getBoundingClientRect().left - s.track.getBoundingClientRect().left;
  });
  expect(Math.abs(position)).toBeLessThan(1);
  expect(errors).toEqual([]);
});
