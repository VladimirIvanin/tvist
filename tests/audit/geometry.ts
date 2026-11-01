import { expect, type Page } from '@playwright/test';
import type { Tvist } from '../../src/core/Tvist';
import type { TvistOptions } from '../../src/core/types';
import { coverageHoles } from './dom-oracles';

/** Browser-only audit: expectations use rendered geometry and the public facade. */
type AuditWindow = Window &
  typeof globalThis & {
    TvistV1: typeof Tvist;
    auditSlider?: Tvist;
    auditGeometryOriginals?: HTMLElement[];
    auditGeometryExtras?: Tvist[];
  };

interface Fixture {
  count?: number;
  width?: number;
  height?: number;
  widths?: number[];
  heights?: number[];
  hidden?: boolean;
  contents?: string[];
}

interface GeometryCase {
  id: string;
  title: string;
  family: string;
  priority: 'P0' | 'P1' | 'P2';
  sources: string[];
  run(page: Page): Promise<void>;
}

async function settle(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const slider = (window as AuditWindow).auditSlider;
    if (!slider) throw new Error('GEOMETRY_SETUP: missing public slider');
    const deadline = performance.now() + 6000;
    let previous = '';
    let stable = 0;
    await new Promise<void>((resolve, reject) => {
      const tick = () => {
        const nodes = [slider.track, slider.container, ...slider.slides];
        const state = JSON.stringify(
          nodes.map((node) => {
            const rect = node.getBoundingClientRect();
            const style = getComputedStyle(node);
            return [rect.x, rect.y, rect.width, rect.height, style.transform, style.opacity];
          })
        );
        const running = slider.root
          .getAnimations({ subtree: true })
          .some((animation) => animation.playState === 'running' || animation.pending);
        stable = state === previous && !running ? stable + 1 : 0;
        previous = state;
        if (stable >= 4) resolve();
        else if (performance.now() > deadline) reject(new Error('GEOMETRY_SETTLE_TIMEOUT'));
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  });
}

async function mount(page: Page, options: TvistOptions = {}, fixture: Fixture = {}): Promise<void> {
  await page.evaluate((serialized) => {
    const { options, fixture } = JSON.parse(serialized) as {
      options: TvistOptions;
      fixture: Fixture;
    };
    const context = window as AuditWindow;
    context.auditGeometryExtras?.forEach((slider) => slider.destroy({ destroyNested: true }));
    context.auditGeometryExtras = [];
    context.auditSlider?.destroy({ destroyNested: true });
    document.body.replaceChildren();
    document.body.style.margin = '0';
    document.getElementById('audit-geometry-style')?.remove();
    const classes = context.TvistV1.CLASSES;
    const count = fixture.count ?? 7;
    const width = fixture.width ?? 720;
    const height = fixture.height ?? 360;
    const style = document.createElement('style');
    style.id = 'audit-geometry-style';
    style.textContent = Array.from(
      { length: count },
      (_, index) =>
        `#audit-root [data-audit-index="${index}"] { width:${fixture.widths?.[index] ?? width}px; height:${fixture.heights?.[index] ?? height}px; }`
    ).join('\n');
    document.head.appendChild(style);
    const root = document.createElement('div');
    root.id = 'audit-root';
    root.className = classes.block;
    root.style.cssText = `width:${width}px;height:${height}px;${fixture.hidden ? 'display:none;' : ''}`;
    const track = document.createElement('div');
    track.className = classes.track;
    track.style.height = `${height}px`;
    const container = document.createElement('div');
    container.className = classes.container;
    const originals: HTMLElement[] = [];
    for (let index = 0; index < count; index += 1) {
      const slide = document.createElement('div');
      slide.className = classes.slide;
      slide.dataset.auditIndex = String(index);
      if (fixture.contents?.[index] !== undefined) slide.innerHTML = fixture.contents[index]!;
      else slide.textContent = `Card ${index}`;
      originals.push(slide);
      container.appendChild(slide);
    }
    track.appendChild(container);
    root.appendChild(track);
    document.body.appendChild(root);
    context.auditGeometryOriginals = originals;
    context.auditSlider = new context.TvistV1(root, {
      visibility: false,
      speed: 0,
      roundLengths: false,
      ...options,
    });
  }, JSON.stringify({ options, fixture }));
  await settle(page);
}

async function state(page: Page) {
  return page.evaluate(() => {
    const context = window as AuditWindow;
    const slider = context.auditSlider!;
    const classes = context.TvistV1.CLASSES;
    const track = slider.track.getBoundingClientRect();
    const trackStyle = getComputedStyle(slider.track);
    return {
      realIndex: slider.realIndex,
      activeIndex: slider.activeIndex,
      count: slider.originalSlideCount,
      canNext: slider.canScrollNext,
      canPrev: slider.canScrollPrev,
      perPage: slider.options.perPage,
      track: { width: track.width, height: track.height },
      padding: [
        trackStyle.paddingLeft,
        trackStyle.paddingRight,
        trackStyle.paddingTop,
        trackStyle.paddingBottom,
      ].map(Number.parseFloat),
      transform: getComputedStyle(slider.container).transform,
      originalIdentity:
        context.auditGeometryOriginals?.every((node) => slider.root.contains(node)) ?? false,
      slides: slider.slides.map((slide) => {
        const rect = slide.getBoundingClientRect();
        const style = getComputedStyle(slide);
        return {
          id: slide.dataset.auditIndex ?? null,
          real: slide.getAttribute('data-tvist-slide-index'),
          active: slide.classList.contains(classes.slideActive),
          clone: slide.classList.contains(classes.slideClone),
          x: rect.left - track.left,
          y: rect.top - track.top,
          width: rect.width,
          height: rect.height,
          opacity: Number(style.opacity),
          marginRight: Number.parseFloat(style.marginRight),
          marginBottom: Number.parseFloat(style.marginBottom),
          cards: [...slide.querySelectorAll<HTMLElement>('[data-audit-index]')].map(
            (node) => node.dataset.auditIndex
          ),
        };
      }),
    };
  });
}

async function navigate(page: Page, direction: 'next' | 'prev'): Promise<void> {
  await page.evaluate((direction) => (window as AuditWindow).auditSlider![direction](), direction);
  await settle(page);
}

async function go(page: Page, index: number): Promise<void> {
  await page.evaluate((index) => (window as AuditWindow).auditSlider!.scrollTo(index, true), index);
  await settle(page);
}

async function change(page: Page, options: Partial<TvistOptions>): Promise<void> {
  await page.evaluate((serialized) => {
    (window as AuditWindow).auditSlider!.updateOptions(
      JSON.parse(serialized) as Partial<TvistOptions>
    );
  }, JSON.stringify(options));
  await settle(page);
}

function near(actual: number, expected: number, oracle: string, tolerance = 1): void {
  expect(Number.isFinite(actual), `${oracle}: finite geometry`).toBe(true);
  expect(
    Math.abs(actual - expected),
    `${oracle}: ${actual} versus ${expected}`
  ).toBeLessThanOrEqual(tolerance);
}

function coherent(current: Awaited<ReturnType<typeof state>>, oracle: string): void {
  expect(current.originalIdentity, `${oracle}: original node identity`).toBe(true);
  for (const slide of current.slides) {
    expect(
      [slide.x, slide.y, slide.width, slide.height].every(Number.isFinite),
      `${oracle}: finite DOMRect`
    ).toBe(true);
  }
  if (current.count > 0) {
    const active = current.slides.filter((slide) => slide.active);
    expect(active, `${oracle}: exactly one active DOM slide`).toHaveLength(1);
    const chosen = active[0]!;
    if (chosen.real !== null)
      expect(Number(chosen.real), `${oracle}: active real identity`).toBe(current.realIndex);
    else if (chosen.id !== null)
      expect(Number(chosen.id), `${oracle}: active original identity`).toBe(current.realIndex);
  }
}

function coversViewport(
  current: Awaited<ReturnType<typeof state>>,
  oracle: string,
  gap: number
): void {
  const holes = coverageHoles(
    { left: 0, top: 0, right: current.track.width, bottom: current.track.height },
    current.slides.map((slide) => ({
      left: slide.x,
      top: slide.y,
      right: slide.x + slide.width,
      bottom: slide.y + slide.height,
    })),
    'horizontal',
    gap,
    1
  );
  expect(holes, `${oracle}: no unconfigured holes in the viewport`).toEqual([]);
}

const cases: GeometryCase[] = [
  {
    id: 'G01',
    title: 'Fallback clones retain one active slide and viewport coverage',
    family: 'geometry',
    priority: 'P0',
    sources: ['https://github.com/Splidejs/splide/issues/1362'],
    async run(page) {
      await mount(page, { perPage: 2, loop: true, gap: 13.5, pagination: true }, { count: 3 });
      for (const direction of ['next', 'prev'] as const) {
        for (let iteration = 0; iteration < 9; iteration += 1) {
          await navigate(page, direction);
          const current = await state(page);
          coherent(current, 'G01_ACTIVE');
          coversViewport(current, 'G01_COVERAGE', 13.5);
        }
      }
    },
  },
  {
    id: 'G02',
    title: 'Documented loop auto loops when enough original slides exist',
    family: 'geometry',
    priority: 'P1',
    sources: [],
    async run(page) {
      await mount(page, { loop: 'auto', perPage: 1 }, { count: 7 });
      await go(page, 6);
      await navigate(page, 'next');
      const current = (await state(page)).realIndex;
      if (current !== 0)
        throw new Error(
          `CONTRACT_GAP: G02 loop:'auto' is declared but no automatic mode implementation was found; after next from last, actual=${current}. Automatic-selection policy requires clarification.`
        );
    },
  },
  {
    id: 'G03',
    title: 'Changing clone mode updates DOM without remount',
    family: 'geometry',
    priority: 'P0',
    sources: ['https://github.com/Splidejs/splide/issues/1193'],
    async run(page) {
      await mount(page, { loop: true }, { count: 7 });
      await go(page, 3);
      await change(page, { loop: { withClones: true } });
      let current = await state(page);
      expect(
        current.slides.some((slide) => slide.clone),
        'G03_ENABLE_CLONES: requested clone mode applies'
      ).toBe(true);
      expect(current.realIndex, 'G03_SELECTION: changing storage preserves selection').toBe(3);
      await change(page, { loop: { enabled: false, withClones: true } });
      current = await state(page);
      expect(
        current.slides.filter((slide) => slide.clone),
        'G03_DISABLE_CLONES: disabled loop removes clones'
      ).toHaveLength(0);
      expect(current.count, 'G03_ORIGINAL_COUNT').toBe(7);
    },
  },
  {
    id: 'G04',
    title: 'Breakpoint round trips across loop buffer threshold',
    family: 'geometry',
    priority: 'P0',
    sources: ['https://github.com/nolimits4web/swiper/issues/6559'],
    async run(page) {
      await mount(
        page,
        {
          loop: true,
          perPage: 1,
          breakpointsBase: 'container',
          breakpoints: { 600: { perPage: 3 } },
        },
        { count: 5 }
      );
      for (const width of [500, 720, 500, 720]) {
        await page.evaluate((width) => {
          const slider = (window as AuditWindow).auditSlider!;
          slider.root.style.width = `${width}px`;
          slider.update();
        }, width);
        await settle(page);
        for (let iteration = 0; iteration < 6; iteration += 1) {
          await navigate(page, 'next');
          const current = await state(page);
          coherent(current, 'G04_ACTIVE');
          coversViewport(current, 'G04_BUFFER_COVERAGE', 0);
        }
      }
    },
  },
  {
    id: 'G05',
    title: 'Incomplete grouped loop visits all original cards',
    family: 'geometry',
    priority: 'P0',
    sources: ['https://github.com/nolimits4web/swiper/issues/6472'],
    async run(page) {
      await mount(
        page,
        { loop: true, perPage: 3, slidesPerGroup: 2, pagination: true },
        { count: 7 }
      );
      const seen = new Set<number>();
      for (let iteration = 0; iteration < 14; iteration += 1) {
        await navigate(page, 'next');
        const current = await state(page);
        coherent(current, 'G05_ACTIVE');
        seen.add(current.realIndex);
        coversViewport(current, 'G05_GROUP_COVERAGE', 0);
      }
      expect(
        [...seen].sort((a, b) => a - b),
        'G05_REACHABILITY: coprime group/count visits each original'
      ).toEqual([0, 1, 2, 3, 4, 5, 6]);
    },
  },
  {
    id: 'G06',
    title: 'Fractional perPage reaches a physical end with a valid active card',
    family: 'geometry',
    priority: 'P0',
    sources: ['https://github.com/nolimits4web/swiper/issues/6689'],
    async run(page) {
      await mount(
        page,
        { perPage: 1.5, slidesPerGroup: 2, pagination: { type: 'fraction' } },
        { count: 5 }
      );
      for (let iteration = 0; iteration < 5; iteration += 1) await navigate(page, 'next');
      const current = await state(page);
      coherent(current, 'G06_ACTIVE_CARD');
      const last = current.slides.find((slide) => slide.id === '4')!;
      near(last.x + last.width, current.track.width, 'G06_END_EDGE');
      // Fraction text is deliberately not asserted: its page semantics need a product decision.
    },
  },
  {
    id: 'G07',
    title: 'Variable width centered loop preserves visual center through seams',
    family: 'geometry',
    priority: 'P0',
    sources: ['https://github.com/nolimits4web/swiper/issues/7857'],
    async run(page) {
      await mount(
        page,
        { autoWidth: true, center: true, loop: true, gap: 16 },
        { count: 5, widths: [80, 320, 110, 640, 75] }
      );
      for (const index of [0, 4, 1, 3, 2, 0, 4, 0]) {
        await go(page, index);
        const current = await state(page);
        coherent(current, 'G07_ACTIVE');
        const active = current.slides.find((slide) => slide.active)!;
        near(active.x + active.width / 2, current.track.width / 2, 'G07_CENTER');
      }
    },
  },
  {
    id: 'G08',
    title: 'Isolated autoWidth update restores CSS widths immediately',
    family: 'geometry',
    priority: 'P0',
    sources: ['https://github.com/Splidejs/splide/issues/1384'],
    async run(page) {
      const widths = [80, 320, 110, 640, 75];
      await mount(page, { perPage: 3 }, { count: 5, widths });
      await change(page, { autoWidth: true });
      const current = await state(page);
      for (let index = 0; index < widths.length; index += 1)
        near(current.slides[index]!.width, widths[index]!, 'G08_AUTO_WIDTH');
    },
  },
  {
    id: 'G09',
    title: 'Isolated vertical autoHeight update restores CSS heights',
    family: 'geometry',
    priority: 'P0',
    sources: [],
    async run(page) {
      const heights = [70, 220, 110, 430, 75];
      await mount(page, { direction: 'vertical', perPage: 2 }, { count: 5, heights });
      await change(page, { autoHeight: true });
      const current = await state(page);
      for (let index = 0; index < heights.length; index += 1)
        near(current.slides[index]!.height, heights[index]!, 'G09_AUTO_HEIGHT');
    },
  },
  {
    id: 'G10',
    title: 'CSS calc gap agrees with rendered navigation distance',
    family: 'geometry',
    priority: 'P0',
    sources: [],
    async run(page) {
      await mount(page, { perPage: 2, gap: 'calc(1rem + 2px)', roundLengths: false }, { count: 7 });
      const before = await state(page);
      expect(
        before.slides[1]!.x - before.slides[0]!.width,
        'G10_CSS_GAP: fixture has positive browser gap'
      ).toBeGreaterThan(2);
      await go(page, 1);
      const after = await state(page);
      near(after.slides.find((slide) => slide.id === '1')!.x, 0, 'G10_GAP_NAVIGATION');
    },
  },
  {
    id: 'G11',
    title: 'Vertical percentage gap uses CSS inline-size basis',
    family: 'geometry',
    priority: 'P1',
    sources: [],
    async run(page) {
      await mount(
        page,
        { direction: 'vertical', fixedHeight: 100, gap: '3%' },
        { count: 7, width: 600, height: 360 }
      );
      const before = await state(page);
      near(before.slides[1]!.y - before.slides[0]!.height, 18, 'G11_PERCENT_MARGIN');
      await go(page, 1);
      near(
        (await state(page)).slides.find((slide) => slide.id === '1')!.y,
        0,
        'G11_VERTICAL_NAVIGATION'
      );
    },
  },
  {
    id: 'G12',
    title: 'Fixed percentage widths follow container resize',
    family: 'geometry',
    priority: 'P1',
    sources: [],
    async run(page) {
      await mount(page, { fixedWidth: '30%', gap: 12 }, { count: 7, width: 720 });
      near((await state(page)).slides[0]!.width, 216, 'G12_INITIAL_WIDTH');
      await page.evaluate(() => {
        const slider = (window as AuditWindow).auditSlider!;
        slider.root.style.width = '500px';
        slider.update();
      });
      await settle(page);
      near((await state(page)).slides[0]!.width, 150, 'G12_RESIZED_WIDTH');
      await go(page, 1);
      near(
        (await state(page)).slides.find((slide) => slide.id === '1')!.x,
        0,
        'G12_RESIZED_NAVIGATION'
      );
    },
  },
  {
    id: 'G13',
    title: 'Focus center trims asymmetric peek at both ends',
    family: 'geometry',
    priority: 'P0',
    sources: ['https://github.com/nolimits4web/swiper/issues/6689'],
    async run(page) {
      await mount(
        page,
        { perPage: 3, center: { focus: true }, peek: { left: 16, right: 64 }, gap: 13.5 },
        { count: 9 }
      );
      near((await state(page)).slides[0]!.x, 0, 'G13_LEADING_TRIM');
      await go(page, 4);
      let current = await state(page);
      const middle = current.slides.find((slide) => slide.id === '4')!;
      near(middle.x + middle.width / 2, (16 + 720 - 64) / 2, 'G13_MIDDLE_CENTER');
      await go(page, 8);
      current = await state(page);
      const last = current.slides.find((slide) => slide.id === '8')!;
      near(last.x + last.width, 720, 'G13_TRAILING_TRIM');
    },
  },
  {
    id: 'G14',
    title: 'Locked center justify is idempotent in a CSS grid parent',
    family: 'geometry',
    priority: 'P0',
    sources: [],
    async run(page) {
      await mount(page, { perPage: 3, center: { justify: true }, gap: 12 }, { count: 2 });
      await page.evaluate(() => {
        const slider = (window as AuditWindow).auditSlider!;
        const parent = document.createElement('div');
        parent.style.cssText = 'display:grid;grid-template-columns:1fr;width:720px';
        slider.root.before(parent);
        parent.appendChild(slider.root);
        slider.root.style.width = '100%';
        slider.update();
      });
      await settle(page);
      const before = await state(page);
      await page.evaluate(() => {
        for (let index = 0; index < 50; index += 1) (window as AuditWindow).auditSlider!.update();
      });
      await settle(page);
      const after = await state(page);
      near(after.track.width, before.track.width, 'G14_STABLE_TRACK');
      near(after.slides[0]!.width, before.slides[0]!.width, 'G14_STABLE_CARD');
      near(
        after.slides[0]!.x + after.slides[1]!.x + after.slides[1]!.width,
        after.track.width,
        'G14_GROUP_CENTER',
        2
      );
    },
  },
  {
    id: 'G15',
    title: 'Subpixel loop navigation does not accumulate displacement',
    family: 'geometry',
    priority: 'P1',
    sources: ['https://github.com/Splidejs/splide/issues/1125'],
    async run(page) {
      for (const roundLengths of [false, true]) {
        await mount(
          page,
          { perPage: 3, gap: 13.5, loop: true, roundLengths },
          { count: 10, width: 719.5 }
        );
        for (let iteration = 0; iteration < 30; iteration += 1) {
          await navigate(page, 'next');
          const current = await state(page);
          coherent(current, 'G15_ACTIVE');
          const active = current.slides.find((slide) => slide.active)!;
          near(active.x, 0, 'G15_NO_DRIFT');
        }
      }
    },
  },
  {
    id: 'G16',
    title: 'Geometry update cancels an in-flight transition cleanly',
    family: 'geometry',
    priority: 'P0',
    sources: [],
    async run(page) {
      await mount(page, { speed: 600, perPage: 1 }, { count: 7 });
      await page.evaluate(() => (window as AuditWindow).auditSlider!.next());
      await page.waitForFunction(() => {
        const slider = (window as AuditWindow).auditSlider!;
        const x = new DOMMatrixReadOnly(getComputedStyle(slider.container).transform).m41;
        return x < -10 && x > -710;
      });
      await change(page, { direction: 'vertical', perPage: 2 });
      const current = await state(page);
      coherent(current, 'G16_ACTIVE');
      const active = current.slides.find((slide) => slide.active)!;
      near(active.y, 0, 'G16_NEW_AXIS_TARGET');
      near(active.x, 0, 'G16_OLD_AXIS_CLEARED');
    },
  },
  {
    id: 'G17',
    title: 'Changing axis clears old peek padding',
    family: 'geometry',
    priority: 'P0',
    sources: [],
    async run(page) {
      await mount(page, { peek: { left: 16, right: 64 } });
      await change(page, { direction: 'vertical', peek: { top: 10, bottom: 30 } });
      const current = await state(page);
      near(current.padding[0]!, 0, 'G17_OLD_LEFT_PADDING');
      near(current.padding[1]!, 0, 'G17_OLD_RIGHT_PADDING');
      near(current.padding[2]!, 10, 'G17_TOP_PADDING');
      near(current.padding[3]!, 30, 'G17_BOTTOM_PADDING');
    },
  },
  {
    id: 'G18',
    title: 'Incomplete vertical grid page retains card sizes and order',
    family: 'geometry',
    priority: 'P0',
    sources: ['https://github.com/nolimits4web/swiper/issues/8097'],
    async run(page) {
      await mount(
        page,
        { grid: { rows: 2, cols: 2 }, direction: 'vertical', gap: 12 },
        { count: 11 }
      );
      await go(page, 2);
      const current = await state(page);
      expect(
        current.slides.map((slide) => slide.cards),
        'G18_CARD_ORDER'
      ).toEqual([
        ['0', '1', '2', '3'],
        ['4', '5', '6', '7'],
        ['8', '9', '10'],
      ]);
      near(current.slides[2]!.y, 0, 'G18_LAST_PAGE_POSITION');
      const cards = await page.evaluate(() =>
        [
          ...(window as AuditWindow).auditSlider!.root.querySelectorAll<HTMLElement>(
            '[data-audit-index]'
          ),
        ].map((card) => {
          const rect = card.getBoundingClientRect();
          return { width: rect.width, height: rect.height };
        })
      );
      near(cards[10]!.width, cards[0]!.width, 'G18_INCOMPLETE_CELL_WIDTH');
      near(cards[10]!.height, cards[0]!.height, 'G18_INCOMPLETE_CELL_HEIGHT');
    },
  },
  {
    id: 'G19',
    title: 'Isolated grid update rebuilds pages without external refresh',
    family: 'geometry',
    priority: 'P0',
    sources: [],
    async run(page) {
      await mount(page, { grid: { rows: 2, cols: 2 } }, { count: 11 });
      await change(page, { grid: { rows: 1, cols: 3 } });
      const current = await state(page);
      expect(
        current.slides.map((slide) => slide.cards),
        'G19_GRID_STRUCTURE_UPDATE'
      ).toEqual([
        ['0', '1', '2'],
        ['3', '4', '5'],
        ['6', '7', '8'],
        ['9', '10'],
      ]);
      expect(current.originalIdentity, 'G19_ORIGINAL_NODE_IDENTITY').toBe(true);
    },
  },
  {
    id: 'G20',
    title: 'Grid loop lifecycle retains each original card once',
    family: 'geometry',
    priority: 'P0',
    sources: ['https://github.com/Splidejs/splide/issues/1289'],
    async run(page) {
      await mount(page, { grid: { rows: 2, cols: 2 }, loop: true, gap: 12 }, { count: 11 });
      for (let iteration = 0; iteration < 8; iteration += 1) await navigate(page, 'next');
      await page.evaluate(() => {
        const slider = (window as AuditWindow).auditSlider!;
        slider.disable();
        slider.enable();
      });
      await settle(page);
      const result = await page.evaluate(() => {
        const context = window as AuditWindow;
        const slider = context.auditSlider!;
        return {
          originalsPresent: context.auditGeometryOriginals!.every((node) =>
            slider.root.contains(node)
          ),
          nonCloneCards: [...slider.root.querySelectorAll<HTMLElement>('[data-audit-index]')]
            .filter((card) => !card.closest(`.${context.TvistV1.CLASSES.slideClone}`))
            .map((card) => Number(card.dataset.auditIndex))
            .sort((a, b) => a - b),
        };
      });
      expect(result.originalsPresent, 'G20_ORIGINALS_PRESENT').toBe(true);
      expect(result.nonCloneCards, 'G20_NO_DUPLICATED_ORIGINAL_CARDS').toEqual(
        Array.from({ length: 11 }, (_, index) => index)
      );
    },
  },
  {
    id: 'G21',
    title: 'A hidden slider recovers its layout after being shown',
    family: 'geometry',
    priority: 'P0',
    sources: ['https://github.com/Splidejs/splide/issues/575'],
    async run(page) {
      await mount(page, { direction: 'vertical', perPage: 2, gap: 12 }, { count: 7, hidden: true });
      await page.evaluate(() => {
        const slider = (window as AuditWindow).auditSlider!;
        slider.root.style.display = '';
        slider.update();
      });
      await settle(page);
      await go(page, 2);
      const current = await state(page);
      coherent(current, 'G21_VISIBLE_ACTIVE');
      near(current.slides.find((slide) => slide.id === '2')!.y, 0, 'G21_VISIBLE_POSITION');
      near(current.slides[0]!.height, 174, 'G21_VISIBLE_SIZE');
    },
  },
  {
    id: 'G22',
    title: 'Fade and cube round trip restores slide geometry',
    family: 'geometry',
    priority: 'P0',
    sources: ['https://github.com/nolimits4web/swiper/issues/8078'],
    async run(page) {
      await mount(page, { perPage: 1 }, { count: 5 });
      for (const effect of ['fade', 'cube', 'slide'] as const) {
        await change(page, { effect });
        await go(page, 2);
      }
      const current = await state(page);
      coherent(current, 'G22_ACTIVE');
      near(current.slides.find((slide) => slide.id === '2')!.x, 0, 'G22_RESTORED_SLIDE_POSITION');
      const styles = await page.evaluate(() => {
        const slider = (window as AuditWindow).auditSlider!;
        return {
          perspective: slider.track.style.perspective,
          shadows: slider.root.querySelectorAll('[class*="shadow-cube"]').length,
          opacities: slider.slides.map((slide) => slide.style.opacity),
          cube: slider.root.classList.contains((window as AuditWindow).TvistV1.CLASSES.cube),
        };
      });
      expect(styles, 'G22_EFFECT_CLEANUP').toEqual({
        perspective: '',
        shadows: 0,
        opacities: ['', '', '', '', ''],
        cube: false,
      });
    },
  },
  {
    id: 'G23',
    title: 'Vertical fade has overlapping partially visible cards',
    family: 'geometry',
    priority: 'P1',
    sources: ['https://github.com/nolimits4web/swiper/issues/8078'],
    async run(page) {
      await mount(page, { effect: 'fade', direction: 'vertical', speed: 800 }, { count: 5 });
      await page.evaluate(() => (window as AuditWindow).auditSlider!.next());
      await page.waitForFunction(() => {
        const slides = (window as AuditWindow).auditSlider!.slides;
        return [slides[0], slides[1]].every((slide) => {
          const opacity = Number(getComputedStyle(slide!).opacity);
          return opacity > 0.1 && opacity < 0.9;
        });
      });
      const current = await state(page);
      near(current.slides[0]!.x, current.slides[1]!.x, 'G23_FADE_OVERLAP_X');
      near(current.slides[0]!.y, current.slides[1]!.y, 'G23_FADE_OVERLAP_Y');
      await settle(page);
    },
  },
  {
    id: 'G24',
    title: 'Thumbs update and breakpoint round trip preserve synchronization',
    family: 'geometry',
    priority: 'P0',
    sources: [
      'https://github.com/Splidejs/splide/issues/1268',
      'https://github.com/Splidejs/splide/issues/649',
    ],
    async run(page) {
      await mount(page, {}, { count: 7 });
      await page.evaluate(() => {
        const context = window as AuditWindow;
        const classes = context.TvistV1.CLASSES;
        const root = document.createElement('div');
        root.id = 'audit-thumbs';
        root.className = classes.block;
        root.style.cssText = 'width:720px;height:80px';
        root.innerHTML = `<div class="${classes.track}" style="height:80px"><div class="${classes.container}">${Array.from({ length: 7 }, (_, index) => `<button class="${classes.slide}" type="button" data-thumb-index="${index}" style="height:80px">${index}</button>`).join('')}</div></div>`;
        document.body.appendChild(root);
        const thumbs = new context.TvistV1(root, {
          visibility: false,
          speed: 0,
          perPage: 3,
          isNavigation: true,
          breakpointsBase: 'container',
          breakpoints: { 500: { enabled: false } },
        });
        context.auditGeometryExtras = [thumbs];
        context.auditSlider!.updateOptions({ thumbs: { slider: thumbs } });
      });
      await page.locator('[data-thumb-index="1"]').click();
      await settle(page);
      expect((await state(page)).realIndex, 'G24_DYNAMIC_THUMBS_BIND').toBe(1);
      await page.evaluate(() => {
        const thumbs = (window as AuditWindow).auditGeometryExtras![0]!;
        thumbs.root.style.width = '400px';
        thumbs.update();
      });
      await go(page, 2);
      await page.evaluate(() => {
        const thumbs = (window as AuditWindow).auditGeometryExtras![0]!;
        thumbs.root.style.width = '720px';
        thumbs.enable();
        thumbs.update();
      });
      await page.locator('[data-thumb-index="0"]').click();
      await settle(page);
      expect((await state(page)).realIndex, 'G24_REENABLED_THUMBS_BIND').toBe(0);
    },
  },
  {
    id: 'G25',
    title: 'Empty and single-card layouts remain finite and locked',
    family: 'geometry',
    priority: 'P1',
    sources: ['https://github.com/Splidejs/splide/issues/1362'],
    async run(page) {
      for (const count of [0, 1]) {
        await mount(
          page,
          { perPage: 3, center: { justify: true }, arrows: true, pagination: true },
          { count }
        );
        await navigate(page, 'next');
        await navigate(page, 'prev');
        const current = await state(page);
        coherent(current, 'G25_FINITE_LAYOUT');
        expect(current.canNext || current.canPrev, 'G25_LOCKED_NAVIGATION').toBe(false);
        expect(current.count, 'G25_ORIGINAL_COUNT').toBe(count);
      }
    },
  },
  {
    id: 'G26',
    title: 'Native lazy neighbours agree in explicit and fallback clone modes',
    family: 'geometry',
    priority: 'P1',
    sources: ['https://github.com/Splidejs/splide/issues/527'],
    async run(page) {
      const measurements: number[][] = [];
      for (const loop of [true, { withClones: true }] as const) {
        await mount(
          page,
          { perPage: 2, loop, nativeLazyAdjacent: { onInit: true } },
          {
            count: 3,
            contents: Array.from(
              { length: 3 },
              () =>
                '<img loading="lazy" alt="test" width="20" height="20" src="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2220%22 height=%2220%22/%3E">'
            ),
          }
        );
        measurements.push(
          await page.evaluate(() => {
            const slider = (window as AuditWindow).auditSlider!;
            return [-1, 1].map((offset) => {
              const slide =
                slider.slides[
                  (slider.activeIndex + offset + slider.slides.length) % slider.slides.length
                ]!;
              return slide.querySelector('img')?.loading === 'eager' ? 1 : 0;
            });
          })
        );
      }
      expect(
        measurements[0],
        'G26_FALLBACK_NATIVE_LAZY: actual adjacent copies match explicit clones'
      ).toEqual(measurements[1]);
      expect(measurements[1], 'G26_EXPLICIT_NATIVE_LAZY: adjacent copies are eager').toEqual([
        1, 1,
      ]);
    },
  },
];

export const geometryCases: Array<{
  id: string;
  title: string;
  family: string;
  priority: 'P0' | 'P1' | 'P2';
  sources: string[];
}> = cases.map(({ run: _run, ...metadata }) => metadata);

export async function runGeometryCase(page: Page, id: string): Promise<void> {
  const selected = cases.find((item) => item.id === id);
  if (!selected) throw new Error(`Unknown geometry audit case: ${id}`);
  await selected.run(page);
}
