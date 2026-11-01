import { expect, type Page } from '@playwright/test';
import type { TvistOptions } from '../../src/core/types';
import { mount, type AuditWindow } from './browser-fixture';
import { coverageHoles } from './dom-oracles';
import type { AuditCase } from './types';

const issue = (repository: 'splide' | 'swiper', number: number) =>
  `https://github.com/${repository === 'splide' ? 'Splidejs/splide' : 'nolimits4web/swiper'}/issues/${number}`;

export const sourceGeometryCases: AuditCase[] = [
  {
    id: 'SRC-G01',
    title: 'Two-slide loop survives a short flick and a three-viewport real mouse drag',
    family: 'source-geometry',
    priority: 'P0',
    sources: [issue('splide', 1208)],
  },
  {
    id: 'SRC-G02',
    title: 'Changing peek at the final boundary survives repeated container resizing',
    family: 'source-geometry',
    priority: 'P1',
    sources: [issue('splide', 1364)],
  },
  {
    id: 'SRC-G03',
    title: 'Centered variable-width free loop settles after rapid direction reversals',
    family: 'source-geometry',
    priority: 'P0',
    sources: [issue('swiper', 2942)],
  },
  {
    id: 'SRC-G04',
    title: 'Variable-width group pagination remains reachable after drag and group changes',
    family: 'source-geometry',
    priority: 'P0',
    sources: [issue('swiper', 7981)],
  },
  {
    id: 'SRC-G05',
    title:
      'Twenty window and container breakpoint round trips preserve loop identity and pagination',
    family: 'source-geometry',
    priority: 'P0',
    sources: [issue('swiper', 6113), issue('swiper', 8027)],
  },
  {
    id: 'SRC-G06',
    title:
      'Integer grid with peek and incomplete pages retains cell order over repeated loop seams',
    family: 'source-geometry',
    priority: 'P0',
    sources: [issue('swiper', 8171), issue('swiper', 7870)],
  },
  {
    id: 'SRC-G07',
    title: 'Fade retains visible content on every sampled frame during a mid-transition resize',
    family: 'source-geometry',
    priority: 'P0',
    sources: [issue('swiper', 7656)],
  },
  {
    id: 'SRC-G08',
    title:
      'Cube intermediate DOM faces and slide shadows remain valid in available browser engines',
    family: 'source-geometry',
    priority: 'P1',
    sources: [issue('swiper', 8168)],
  },
  {
    id: 'SRC-G09',
    title:
      'Flex and grid hosts recover from intrinsic sizing with the explicit min-width zero workaround',
    family: 'source-geometry',
    priority: 'P1',
    sources: [issue('swiper', 2914)],
  },
  {
    id: 'SRC-G10',
    title:
      'Non-centered variable-width loop preserves small asymmetric peek at initialization and seams',
    family: 'source-geometry',
    priority: 'P0',
    sources: [
      'https://github.com/nolimits4web/swiper/commit/bc4a6588a81d3c5c2ea9ae345eba35fc3f1ed3d9',
    ],
  },
  {
    id: 'SRC-G11',
    title:
      'Six-slide centered loop reaches every from-to pair with four visible slides and a large gap',
    family: 'source-geometry',
    priority: 'P0',
    sources: [
      'https://github.com/nolimits4web/swiper/commit/f5f9adc9947da3d99b781dcb6246cee943673a9f',
    ],
  },
  {
    id: 'SRC-G12',
    title: 'Fixed-width focus centering trims the last gap at both resized boundaries',
    family: 'source-geometry',
    priority: 'P1',
    sources: ['https://github.com/Splidejs/splide/commit/7304828a1e3a21219686ae602d07713f6ec7b9ae'],
  },
];

/** Includes RAF inertia and per-slide effect styles, not just CSS transitions. */
async function stable(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const s = (window as unknown as AuditWindow).auditSlider;
    let previous = '';
    let equal = 0;
    const start = performance.now();
    await new Promise<void>((resolve, reject) => {
      const frame = () => {
        const signature = JSON.stringify(
          [s.container, ...s.slides].map((node) => {
            const r = node.getBoundingClientRect();
            const style = getComputedStyle(node);
            return [r.x, r.y, r.width, r.height, style.transform, style.opacity];
          })
        );
        const running = s.root
          .getAnimations({ subtree: true })
          .some((animation) => animation.pending || animation.playState === 'running');
        equal = signature === previous && !running ? equal + 1 : 0;
        previous = signature;
        if (equal >= 5) resolve();
        else if (performance.now() - start > 8000) reject(new Error('SOURCE_GEOMETRY_NOT_SETTLED'));
        else requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
  });
}

async function measured(page: Page) {
  return page.evaluate(() => {
    const w = window as unknown as AuditWindow;
    const s = w.auditSlider;
    const rect = (node: Element) => {
      const r = node.getBoundingClientRect();
      return {
        left: r.left,
        right: r.right,
        top: r.top,
        bottom: r.bottom,
        width: r.width,
        height: r.height,
      };
    };
    const padding = getComputedStyle(s.track);
    return {
      index: s.realIndex,
      count: s.originalSlideCount,
      canNext: s.canScrollNext,
      track: rect(s.track),
      paddingLeft: parseFloat(padding.paddingLeft),
      paddingRight: parseFloat(padding.paddingRight),
      slides: s.slides.map((node) => ({ ...rect(node), id: node.dataset.caseId })),
      originalsConnected: w.auditOriginals!.every((node) => s.root.contains(node)),
      transform: getComputedStyle(s.container).transform,
    };
  });
}

async function covered(page: Page, oracle: string, gap = 0, trimPadding = false): Promise<void> {
  const state = await measured(page);
  expect(state.originalsConnected, `${oracle}_ORIGINALS`).toBe(true);
  expect(state.transform, `${oracle}_FINITE_TRANSFORM`).not.toMatch(/NaN|Infinity/);
  expect(state.index, `${oracle}_INDEX`).toBeGreaterThanOrEqual(0);
  expect(state.index, `${oracle}_INDEX`).toBeLessThan(state.count);
  const viewport = {
    ...state.track,
    left: state.track.left + (trimPadding ? state.paddingLeft : 0),
    right: state.track.right - (trimPadding ? state.paddingRight : 0),
  };
  expect(
    coverageHoles(viewport, state.slides, 'horizontal', gap, 1),
    `${oracle}_VIEWPORT_HOLE`
  ).toEqual([]);
}

async function drag(page: Page, delta: number, wait = true): Promise<void> {
  const box = (await page.locator('#audit-slider > .tvist-v1__track').boundingBox())!;
  const x = box.x + box.width * (delta < 0 ? 0.8 : 0.2);
  const y = box.y + box.height * 0.4;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + delta, y, { steps: Math.abs(delta) > 500 ? 20 : 5 });
  await page.mouse.up();
  if (wait) await stable(page);
}

async function update(page: Page, options: Partial<TvistOptions>): Promise<void> {
  await page.evaluate(
    (serialized) =>
      (window as unknown as AuditWindow).auditSlider.updateOptions(
        JSON.parse(serialized) as Partial<TvistOptions>
      ),
    JSON.stringify(options)
  );
  await stable(page);
}

/** Frame observations are DOM/hit-testing evidence, not physical Safari compositor certification. */
async function effectFrames(page: Page, resize: boolean) {
  return page.evaluate(async (resize) => {
    const s = (window as unknown as AuditWindow).auditSlider;
    const samples: Array<{
      visible: number;
      translucent: number;
      transform: string;
      finite: boolean;
      hitFace: boolean;
      shadows: number[];
    }> = [];
    s.next();
    for (let frame = 0; frame < 42; frame++) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      if (resize && frame === 5) {
        s.root.style.width = '430px';
        s.root.style.height = '260px';
        s.track.style.height = '260px';
        s.update();
      }
      const track = s.track.getBoundingClientRect();
      const x = track.left + track.width / 2;
      const y = track.top + track.height / 2;
      const cards = s.slides.map((slide) => {
        const rect = slide.getBoundingClientRect();
        const style = getComputedStyle(slide);
        return {
          opacity: Number(style.opacity),
          visible:
            style.visibility !== 'hidden' &&
            style.display !== 'none' &&
            rect.left <= x &&
            rect.right >= x &&
            rect.top <= y &&
            rect.bottom >= y,
          finite:
            [rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) &&
            !/NaN|Infinity/.test(style.transform),
        };
      });
      const hit = document.elementFromPoint(x, y)?.closest('.tvist-v1__slide');
      samples.push({
        visible: cards.filter((card) => card.visible && card.opacity > 0.05).length,
        translucent: cards.filter(
          (card) => card.visible && card.opacity > 0.05 && card.opacity < 0.95
        ).length,
        transform: getComputedStyle(s.container).transform,
        finite: cards.every((card) => card.finite),
        hitFace: !!hit && s.root.contains(hit),
        shadows: [...s.root.querySelectorAll('.tvist-v1-slide-shadow-cube')].map((node) =>
          Number(getComputedStyle(node).opacity)
        ),
      });
    }
    return samples;
  }, resize);
}

export async function runSourceGeometryCase(page: Page, id: string): Promise<void> {
  switch (id) {
    case 'SRC-G01': {
      await page.setViewportSize({ width: 1800, height: 800 });
      await mount(
        page,
        { loop: true, speed: 120, flickPower: 100 },
        { count: 2, width: 240, height: 180 }
      );
      await page.evaluate(() => {
        (window as unknown as AuditWindow).auditSlider.root.style.marginLeft = '1200px';
      });
      for (const distance of [-75, -720]) {
        await page.evaluate(() => (window as unknown as AuditWindow).auditSlider.scrollTo(0, true));
        await stable(page);
        await drag(page, distance);
        await covered(page, 'SRC_G01');
        const before = (await measured(page)).index;
        await page.evaluate(() => (window as unknown as AuditWindow).auditSlider.next());
        await stable(page);
        expect((await measured(page)).index, 'SRC_G01_NEXT_REMAINS_USABLE').toBe((before + 1) % 2);
      }
      break;
    }
    case 'SRC-G02': {
      await mount(page, { perPage: 2, gap: 12, roundLengths: false });
      await page.evaluate(() => (window as unknown as AuditWindow).auditSlider.scrollTo(6, true));
      for (const [index, peek] of [32, { left: 24, right: 80 }, '10%', 0].entries()) {
        await update(page, { peek });
        await page.evaluate(
          (width) => {
            const s = (window as unknown as AuditWindow).auditSlider;
            s.root.style.width = `${width}px`;
            s.update();
          },
          index % 2 ? 540 : 720
        );
        await stable(page);
        await covered(page, 'SRC_G02', 12, true);
        const state = await measured(page);
        expect(state.canNext, 'SRC_G02_PRESERVES_END_BOUNDARY').toBe(false);
        const last = state.slides.find((slide) => slide.id === 'card-6')!;
        // Documented default peekTrim=true pins the finite end to the outer edge,
        // not the padded content edge used by the middle-of-track coverage check.
        expect(
          Math.abs(last.right - state.track.right),
          'SRC_G02_LAST_CARD_END_ALIGNMENT'
        ).toBeLessThanOrEqual(1);
      }
      break;
    }
    case 'SRC-G03': {
      for (const freeSnap of [false, true]) {
        await mount(
          page,
          {
            autoWidth: true,
            center: true,
            loop: true,
            drag: 'free',
            freeSnap,
            speed: 700,
            gap: 11,
            flickPower: 150,
          },
          { count: 12, width: 600, widths: [170, 280, 210, 330] }
        );
        for (let reversal = 0; reversal < 8; reversal++)
          await drag(page, reversal % 2 ? 160 : -160, false);
        await stable(page);
        await covered(page, 'SRC_G03', 11);
        await page.evaluate(() => (window as unknown as AuditWindow).auditSlider.next());
        await stable(page);
        await covered(page, 'SRC_G03_AFTER_NEXT', 11);
      }
      break;
    }
    case 'SRC-G04': {
      await mount(
        page,
        { autoWidth: true, slidesPerGroup: 3, pagination: true, gap: 12, speed: 100 },
        { count: 8, width: 540, widths: [170, 260, 210, 320] }
      );
      const bullets = page.locator('#audit-slider .tvist-v1__bullet');
      await bullets.last().click();
      await stable(page);
      await drag(page, 180);
      await update(page, { slidesPerGroup: 2 });
      await bullets.first().click();
      await stable(page);
      expect((await measured(page)).index, 'SRC_G04_FIRST_REACHABLE').toBe(0);
      await expect(bullets.first(), 'SRC_G04_FIRST_BULLET_ACTIVE').toHaveClass(
        /tvist-v1__bullet--active/
      );
      await bullets.last().click();
      await stable(page);
      expect((await measured(page)).canNext, 'SRC_G04_LAST_REACHABLE').toBe(false);
      await expect(bullets.last(), 'SRC_G04_LAST_BULLET_ACTIVE').toHaveClass(
        /tvist-v1__bullet--active/
      );
      await covered(page, 'SRC_G04', 12);
      break;
    }
    case 'SRC-G05': {
      for (const base of ['window', 'container'] as const) {
        await page.setViewportSize({ width: 1100, height: 800 });
        await mount(
          page,
          {
            loop: true,
            perPage: 3,
            slidesPerGroup: 2,
            pagination: true,
            breakpointsBase: base,
            breakpoints: { 650: { perPage: 1, slidesPerGroup: 1 } },
          },
          { count: 12, width: 720 }
        );
        await page.evaluate(() =>
          (window as unknown as AuditWindow).auditSlider.scrollTo(11, true)
        );
        await stable(page);
        for (let cycle = 0; cycle < 20; cycle++)
          for (const narrow of [true, false]) {
            const before = (await measured(page)).index;
            if (base === 'window')
              await page.setViewportSize({ width: narrow ? 600 : 1100, height: 800 });
            else
              await page.evaluate(
                (width) => {
                  (window as unknown as AuditWindow).auditSlider.root.style.width = `${width}px`;
                },
                narrow ? 500 : 720
              );
            await expect
              .poll(
                () =>
                  page.evaluate(
                    () => (window as unknown as AuditWindow).auditSlider.options.slidesPerGroup
                  ),
                { message: 'SRC_G05_BREAKPOINT_APPLIED' }
              )
              .toBe(narrow ? 1 : 2);
            await stable(page);
            expect((await measured(page)).index, 'SRC_G05_RESIZE_IDENTITY').toBe(before);
            await expect(
              page.locator('#audit-slider .tvist-v1__pagination'),
              'SRC_G05_SINGLE_PAGINATION'
            ).toHaveCount(1);
            // Bullets expose individual reachable positions; slidesPerGroup changes
            // next/prev distance, while loop keeps all twelve positions reachable.
            await expect(
              page.locator('#audit-slider .tvist-v1__bullet'),
              'SRC_G05_NO_ACCUMULATED_BULLETS'
            ).toHaveCount(12);
          }
      }
      break;
    }
    case 'SRC-G06': {
      // Fractional perPage is explicitly unsupported with grid. Peek is the supported partial-view adaptation.
      for (const count of [7, 9]) {
        await mount(
          page,
          { grid: { rows: 2, cols: 2 }, perPage: 1, peek: 32, loop: true, gap: 12 },
          { count }
        );
        const membership = () =>
          page.evaluate(() => {
            const w = window as unknown as AuditWindow;
            const s = w.auditSlider;
            return [...s.container.children]
              .filter((node) => !node.classList.contains(w.TvistV1.CLASSES.slideClone))
              .map((node) =>
                [...node.querySelectorAll<HTMLElement>('[data-case-id]')].map(
                  (card) => card.dataset.caseId!
                )
              );
          });
        const initial = await membership();
        expect(initial.flat().slice().sort(), 'SRC_G06_INITIAL_MEMBERSHIP').toEqual(
          Array.from({ length: count }, (_, index) => `card-${index}`).sort()
        );
        for (let turn = 0; turn < 18; turn++) {
          await page.evaluate(() => (window as unknown as AuditWindow).auditSlider.next());
          await stable(page);
          const pages = await membership();
          expect(
            pages.map((cards) => cards.join('|')).sort(),
            'SRC_G06_CELL_ORDER_AND_PAGE_MEMBERSHIP'
          ).toEqual(initial.map((cards) => cards.join('|')).sort());
          const anchor = pages.findIndex((cards) => cards[0] === initial[0]![0]);
          expect(
            [...pages.slice(anchor), ...pages.slice(0, anchor)],
            'SRC_G06_PAGE_ORDER_IS_CYCLIC'
          ).toEqual(initial);
        }
        const restored = await page.evaluate(() => {
          const w = window as unknown as AuditWindow;
          w.auditSlider.destroy();
          return [...w.auditSlider.root.querySelectorAll<HTMLElement>('[data-case-id]')].map(
            (card) => card.dataset.caseId
          );
        });
        expect(restored, 'SRC_G06_RESTORED_AUTHOR_ORDER').toEqual(
          Array.from({ length: count }, (_, index) => `card-${index}`)
        );
      }
      break;
    }
    case 'SRC-G07': {
      await mount(page, { effect: 'fade', speed: 700 }, { count: 5, width: 640, height: 320 });
      await page.evaluate(() => {
        const style = document.createElement('style');
        style.id = 'source-fade-authored-height';
        style.textContent = '#audit-slider .tvist-v1__slide { height: 320px; }';
        document.head.append(style);
      });
      await stable(page);
      const validFixture = await page.evaluate(() => {
        const s = (window as unknown as AuditWindow).auditSlider;
        const viewport = s.track.getBoundingClientRect();
        const x = (viewport.left + viewport.right) / 2;
        const y = (viewport.top + viewport.bottom) / 2;
        return s.slides.some((slide) => {
          const rect = slide.getBoundingClientRect();
          const css = getComputedStyle(slide);
          return (
            Number(css.opacity) > 0.05 &&
            css.visibility !== 'hidden' &&
            rect.left <= x &&
            rect.right >= x &&
            rect.top <= y &&
            rect.bottom >= y
          );
        });
      });
      if (!validFixture)
        throw new Error(
          'AUDIT_FIXTURE_ERROR: SRC_G07 initial authored slide does not cover the sampled viewport point'
        );
      const samples = await effectFrames(page, true);
      expect(
        samples.every((sample) => sample.finite),
        'SRC_G07_FINITE_FRAMES'
      ).toBe(true);
      expect(
        samples.every((sample) => sample.visible > 0),
        'SRC_G07_BLANK_FADE_FRAME'
      ).toBe(true);
      expect(
        samples.some((sample) => sample.translucent >= 2),
        'SRC_G07_INTERMEDIATE_FADE_OBSERVED'
      ).toBe(true);
      await stable(page);
      break;
    }
    case 'SRC-G08': {
      for (const slideShadows of [false, true]) {
        await mount(
          page,
          {
            effect: 'cube',
            loop: true,
            speed: 700,
            cubeEffect: { slideShadows, perspective: 900 },
          },
          {
            count: 6,
            width: 360,
            height: 240,
            contents: Array.from(
              { length: 6 },
              (_, index) =>
                `<div style="width:100%;height:100%;background:hsl(${index * 60} 70% 60%)"><button>Face ${index}</button><svg width="80" height="80"><circle cx="40" cy="40" r="30" fill="black"/></svg></div>`
            ),
          }
        );
        const samples = await effectFrames(page, false);
        expect(
          samples.every((sample) => sample.finite),
          'SRC_G08_FINITE_FACES'
        ).toBe(true);
        expect(
          new Set(samples.map((sample) => sample.transform)).size,
          'SRC_G08_INTERMEDIATE_ROTATION_OBSERVED'
        ).toBeGreaterThan(3);
        expect(
          samples.every((sample) => sample.hitFace),
          'SRC_G08_CENTER_HIT_HAS_FACE'
        ).toBe(true);
        expect(
          samples.every((sample) =>
            sample.shadows.every(
              (opacity) => Number.isFinite(opacity) && opacity >= 0 && opacity <= 1
            )
          ),
          'SRC_G08_SHADOW_OPACITY_RANGE'
        ).toBe(true);
        if (slideShadows)
          expect(
            samples.some((sample) =>
              sample.shadows.some((opacity) => opacity > 0.05 && opacity < 0.95)
            ),
            'SRC_G08_INTERMEDIATE_SHADOW_OBSERVED'
          ).toBe(true);
        else
          expect(
            samples.every((sample) => sample.shadows.length === 0),
            'SRC_G08_SHADOWS_DISABLED'
          ).toBe(true);
        await stable(page);
      }
      break;
    }
    case 'SRC-G09': {
      for (const layout of ['flex', 'grid']) {
        await mount(page, { perPage: 2, gap: 12, roundLengths: false }, { count: 20, width: 640 });
        await page.evaluate((layout) => {
          const s = (window as unknown as AuditWindow).auditSlider;
          const host = document.createElement('div');
          host.id = 'source-host';
          host.style.cssText = `display:${layout};width:640px;${layout === 'grid' ? 'grid-template-columns:80px 1fr;' : ''}`;
          const rail = document.createElement('div');
          rail.style.cssText = 'width:80px;flex-shrink:0';
          rail.textContent = 'Rail';
          s.root.before(host);
          host.append(rail, s.root);
          s.root.style.width = '100%';
          s.root.style.flex = '1 1 0%';
          s.update();
        }, layout);
        await stable(page);
        // The intrinsic-minimum baseline is observed, not declared a library defect: CSS requires this host constraint.
        const before = await page.locator('#audit-slider').boundingBox();
        expect(
          before && Number.isFinite(before.width),
          'SRC_G09_INTRINSIC_BASELINE_FINITE'
        ).toBeTruthy();
        await page.evaluate(() => {
          (window as unknown as AuditWindow).auditSlider.root.style.minWidth = '0';
        });
        for (const width of [400, 900, 320, 640]) {
          await page.evaluate((width) => {
            document.getElementById('source-host')!.style.width = `${width}px`;
            (window as unknown as AuditWindow).auditSlider.update();
          }, width);
          await stable(page);
          const parent = (await page.locator('#source-host').boundingBox())!;
          const state = await measured(page);
          expect(
            Math.abs(state.track.width - (parent.width - 80)),
            'SRC_G09_CONSTRAINED_PARENT_WIDTH'
          ).toBeLessThanOrEqual(1);
          expect(
            Math.abs(state.slides[0]!.width - (state.track.width - 12) / 2),
            'SRC_G09_RESPONSIVE_CARD_WIDTH'
          ).toBeLessThanOrEqual(1);
        }
      }
      break;
    }
    case 'SRC-G10': {
      await mount(
        page,
        {
          autoWidth: true,
          loop: true,
          center: false,
          peek: { left: 24, right: 8 },
          gap: 12,
          roundLengths: false,
        },
        { count: 5, width: 600, widths: [160, 230, 180, 270, 210] }
      );
      await stable(page);
      const initial = await measured(page);
      const expectedStart = initial.track.left + initial.paddingLeft;
      const start = initial.slides
        .filter((slide) => slide.id === 'card-0')
        .map((slide) => slide.left)
        .sort((a, b) => Math.abs(a - expectedStart) - Math.abs(b - expectedStart))[0]!;
      expect(
        Math.abs(start - initial.track.left - initial.paddingLeft),
        'SRC_G10_NONCENTERED_INITIAL_ALIGNMENT'
      ).toBeLessThanOrEqual(1);
      for (let updateCount = 0; updateCount < 3; updateCount++) {
        await page.evaluate(() => (window as unknown as AuditWindow).auditSlider.update());
        await stable(page);
        await covered(page, 'SRC_G10_INITIAL_UPDATE', 12, true);
        expect(
          Math.min(
            ...(await measured(page)).slides
              .filter((slide) => slide.id === 'card-0')
              .map((slide) => Math.abs(slide.left - start))
          ),
          'SRC_G10_UPDATE_HAS_NO_JUMP'
        ).toBeLessThanOrEqual(1);
      }
      for (let step = 0; step < 10; step++) {
        await page.evaluate(() => (window as unknown as AuditWindow).auditSlider.next());
        await stable(page);
        await covered(page, 'SRC_G10_LOOP_SEAM', 12, true);
        expect((await measured(page)).index, 'SRC_G10_LOGICAL_SEQUENCE').toBe((step + 1) % 5);
        if ((step + 1) % 5 === 0) {
          const state = await measured(page);
          expect(
            Math.min(
              ...state.slides
                .filter((slide) => slide.id === 'card-0')
                .map((slide) => Math.abs(slide.left - start))
            ),
            'SRC_G10_FULL_CIRCLE_ALIGNMENT'
          ).toBeLessThanOrEqual(1);
        }
      }
      break;
    }
    case 'SRC-G11': {
      for (const loop of [true, { withClones: true }] as const) {
        await mount(
          page,
          { loop, center: true, perPage: 4, gap: 30, speed: 80, roundLengths: false },
          { count: 6 }
        );
        for (let from = 0; from < 6; from++)
          for (let to = 0; to < 6; to++) {
            await page.evaluate(
              (from) => (window as unknown as AuditWindow).auditSlider.scrollTo(from, true),
              from
            );
            await stable(page);
            await page.evaluate(
              (to) => (window as unknown as AuditWindow).auditSlider.scrollTo(to),
              to
            );
            await stable(page);
            const state = await measured(page);
            expect(state.index, `SRC_G11_TARGET_IDENTITY from=${from} to=${to}`).toBe(to);
            const midpoint = (state.track.left + state.track.right) / 2;
            const targetDistances = state.slides
              .filter((slide) => slide.id === `card-${to}`)
              .map((slide) => Math.abs((slide.left + slide.right) / 2 - midpoint));
            expect(targetDistances.length, 'SRC_G11_TARGET_DOM_EXISTS').toBeGreaterThan(0);
            expect(
              Math.min(...targetDistances),
              `SRC_G11_TARGET_CENTER from=${from} to=${to}`
            ).toBeLessThanOrEqual(1);
            await covered(page, 'SRC_G11_ALL_PAIRS_COVERAGE', 30);
          }
      }
      break;
    }
    case 'SRC-G12': {
      await mount(
        page,
        { fixedWidth: 220, gap: 24, center: { focus: true }, roundLengths: false },
        { count: 7, width: 720 }
      );
      for (const width of [720, 540, 720]) {
        await page.evaluate((width) => {
          const s = (window as unknown as AuditWindow).auditSlider;
          s.root.style.width = `${width}px`;
          s.update();
        }, width);
        for (const target of [0, 6]) {
          await page.evaluate(
            (target) => (window as unknown as AuditWindow).auditSlider.scrollTo(target, true),
            target
          );
          await stable(page);
          const state = await measured(page);
          const card = state.slides.find((slide) => slide.id === `card-${target}`)!;
          expect(Math.abs(card.width - 220), 'SRC_G12_FIXED_CARD_WIDTH').toBeLessThanOrEqual(1);
          expect(
            Math.abs(target === 0 ? card.left - state.track.left : card.right - state.track.right),
            'SRC_G12_LAST_GAP_NOT_EXPOSED'
          ).toBeLessThanOrEqual(1);
          if (target === 6) expect(state.canNext, 'SRC_G12_REACHES_END').toBe(false);
          await covered(page, 'SRC_G12_BOUNDARY_COVERAGE', 24);
        }
      }
      break;
    }
    default:
      throw new Error(`Unknown source geometry case ${id}`);
  }
}
