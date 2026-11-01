import { expect, type Page } from '@playwright/test';
import type { TvistOptions } from '../../src/core/types';
import commits from '../../docs/audit/commits.json';
import { mount, settle, check, type AuditWindow } from './browser-fixture';
import type { AuditCase } from './types';
import { coverageHoles, restoredOriginalErrors, settledTransitionErrors } from './dom-oracles';

type CommitWindow = AuditWindow & {
  commitEvents?: Record<string, number>;
  commitFrame?: HTMLIFrameElement;
};
const source = (number: number): string => {
  const commit = commits.find((commit) => commit.id === `COMMIT-${number}`);
  if (!commit) throw new Error(`Unknown researched commit ${number}`);
  return commit.url;
};
export const commitCases: AuditCase[] = [
  {
    id: 'CMT01',
    title: 'Free snap recovers from overscroll at both fixed-width boundaries',
    family: 'commit-regressions',
    priority: 'P0',
    sources: [source(1), source(2)],
  },
  {
    id: 'CMT02',
    title: 'Descendant opacity transitionend cannot finish a parent slide transform',
    family: 'commit-regressions',
    priority: 'P0',
    sources: [source(17)],
  },
  {
    id: 'CMT03',
    title: 'Grid initialized without any measured size recovers after update and reveal',
    family: 'commit-regressions',
    priority: 'P0',
    sources: [source(14)],
  },
  {
    id: 'CMT04',
    title: 'Previously measured grid survives hidden update and reveal at a new size',
    family: 'commit-regressions',
    priority: 'P0',
    sources: [source(14)],
  },
  {
    id: 'CMT05',
    title: 'Hidden scrollbar reaches the correct end after resizing the slider',
    family: 'commit-regressions',
    priority: 'P1',
    sources: [source(15)],
  },
  {
    id: 'CMT06',
    title: 'Continuous resize settles at the final live size without an explicit update',
    family: 'commit-regressions',
    priority: 'P0',
    sources: [source(16)],
  },
  {
    id: 'CMT07',
    title: 'Appending a lazy neighbor and refreshing loads it without navigation',
    family: 'commit-regressions',
    priority: 'P1',
    sources: [source(3)],
  },
  {
    id: 'CMT08',
    title: 'Bounded reentrant refresh does not duplicate loop clones or author nodes',
    family: 'commit-regressions',
    priority: 'P0',
    sources: [source(6)],
  },
  {
    id: 'CMT09',
    title: 'Stopping marquee in its construction task cancels the first scheduled RAF',
    family: 'commit-regressions',
    priority: 'P0',
    sources: [source(9)],
  },
  {
    id: 'CMT10',
    title: 'Stopping marquee after several frames cancels later RAF and supports restart',
    family: 'commit-regressions',
    priority: 'P0',
    sources: [source(9)],
  },
  {
    id: 'CMT11',
    title: 'Foreign-realm root, controls and options preserve DOM identity and defaults',
    family: 'commit-regressions',
    priority: 'P1',
    sources: [source(10), source(22)],
  },
  {
    id: 'CMT12',
    title: 'Breakpoint teardown without pagination DOM preserves author controls',
    family: 'commit-regressions',
    priority: 'P1',
    sources: [source(12)],
  },
];

async function stableMotion(
  page: Page
): Promise<Array<{ time: number; position: number; running: boolean }>> {
  return page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const s = (window as unknown as AuditWindow).auditSlider;
        const samples: Array<{ time: number; position: number; running: boolean }> = [];
        const deadline = performance.now() + 6000;
        let stable = 0;
        const tick = (time: number) => {
          const position = new DOMMatrixReadOnly(getComputedStyle(s.container).transform).m41;
          const running = s.container
            .getAnimations()
            .some((animation) => animation.playState === 'running');
          const previous = samples[samples.length - 1];
          stable =
            previous && Math.abs(previous.position - position) < 0.05 && !running ? stable + 1 : 0;
          samples.push({ time, position, running });
          if (stable >= 6) resolve(samples);
          else if (time > deadline) reject(new Error('CMT_MOTION_DID_NOT_SETTLE'));
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      })
  );
}

async function overscroll(page: Page, direction: 'left' | 'right'): Promise<void> {
  const box = (await page.locator('#audit-slider > .tvist-v1__track').boundingBox())!;
  const x = box.x + (direction === 'left' ? 570 : 150);
  const y = box.y + 100;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + (direction === 'left' ? -420 : 420), y, { steps: 16 });
  await page.mouse.up();
  await stableMotion(page);
}

async function rects(page: Page) {
  return page.evaluate(() => {
    const s = (window as unknown as AuditWindow).auditSlider;
    const rect = (element: Element) => {
      const r = element.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
    };
    return {
      viewport: rect(s.track),
      slides: s.slides.map(rect),
      index: s.realIndex,
      canNext: s.canScrollNext,
      canPrev: s.canScrollPrev,
    };
  });
}

export async function runCommitCase(page: Page, id: string): Promise<void> {
  switch (id) {
    case 'CMT01': {
      await mount(page, {
        fixedWidth: 260,
        gap: 10,
        drag: 'free',
        freeSnap: true,
        rubberband: true,
        speed: 120,
        pagination: true,
      });
      await overscroll(page, 'right');
      const start = await rects(page);
      expect(
        Math.abs(start.slides[0]!.left - start.viewport.left),
        'CMT01_START_SNAP'
      ).toBeLessThanOrEqual(1);
      expect(start.canPrev).toBe(false);
      await page.evaluate(() => (window as unknown as AuditWindow).auditSlider.scrollTo(6, true));
      await stableMotion(page);
      await overscroll(page, 'left');
      const end = await rects(page);
      expect(
        Math.abs(end.slides[end.slides.length - 1]!.right - end.viewport.right),
        'CMT01_END_SNAP'
      ).toBeLessThanOrEqual(1);
      expect(end.canNext).toBe(false);
      await page.evaluate(() => (window as unknown as AuditWindow).auditSlider.prev());
      await stableMotion(page);
      expect((await rects(page)).index, 'CMT01_BOUNCE_COMPLETION_ALLOWS_NAVIGATION').toBeLessThan(
        end.index
      );
      await check(page);
      break;
    }
    case 'CMT02': {
      await mount(
        page,
        { speed: 1200 },
        {
          contents: [
            '<span id="commit-child" style="display:block;opacity:1;transition:opacity 70ms linear">Child transition</span>',
            ...Array.from({ length: 6 }, () => 'Card'),
          ],
        }
      );
      await page.evaluate(() => {
        const w = window as unknown as CommitWindow;
        w.commitEvents = { ends: 0 };
        w.auditSlider.on('transitionEnd', () => {
          w.commitEvents!.ends++;
        });
        w.auditSlider.next();
        document.getElementById('commit-child')!.style.opacity = '0';
      });
      await expect(page.locator('#commit-child')).toHaveCSS('opacity', '0');
      const midway = await page.evaluate(() => {
        const w = window as unknown as CommitWindow;
        return {
          ends: w.commitEvents!.ends,
          transition: w.auditSlider.container.style.transition,
          x: new DOMMatrixReadOnly(getComputedStyle(w.auditSlider.container).transform).m41,
        };
      });
      expect(midway.ends, 'CMT02_DESCENDANT_EARLY_END').toBe(0);
      expect(midway.transition).toContain('transform');
      expect(midway.x).toBeLessThan(0);
      expect(midway.x).toBeGreaterThan(-720);
      const samples = await stableMotion(page);
      expect(settledTransitionErrors(samples, -720), 'CMT02_PARENT_FINISH').toEqual([]);
      expect(
        await page.evaluate(() => (window as unknown as CommitWindow).commitEvents!.ends)
      ).toBe(1);
      break;
    }
    case 'CMT03':
    case 'CMT04': {
      await mount(page, {}, { count: 12 });
      await page.evaluate((neverMeasured) => {
        const w = window as unknown as AuditWindow;
        const root = w.auditSlider.root;
        w.auditSlider.destroy();
        root.style.display = neverMeasured ? 'none' : '';
        w.auditSlider = new w.TvistV1(root, {
          grid: { rows: 2, cols: 2 },
          speed: 0,
          visibility: false,
          gap: 12,
        });
      }, id === 'CMT03');
      if (id === 'CMT04') await settle(page);
      await page.evaluate(() => {
        const s = (window as unknown as AuditWindow).auditSlider;
        s.root.style.display = 'none';
        s.update();
        s.root.style.width = '840px';
        s.update();
        s.root.style.display = '';
        s.update();
      });
      await settle(page);
      const state = await page.evaluate(() => {
        const s = (window as unknown as AuditWindow).auditSlider;
        s.next();
        const viewport = s.track.getBoundingClientRect();
        const active = s.slides[s.activeIndex]!;
        const box = active.getBoundingClientRect();
        return {
          count: s.slideCount,
          index: s.realIndex,
          left: box.left - viewport.left,
          width: box.width,
          viewportWidth: viewport.width,
          cards: [...active.querySelectorAll<HTMLElement>('[data-case-id]')].map(
            (card) => card.dataset.caseId
          ),
          all: [...s.root.querySelectorAll<HTMLElement>('[data-case-id]')].map(
            (card) => card.dataset.caseId
          ),
        };
      });
      expect(state.count, `${id}_GRID_PAGE_COUNT`).toBe(3);
      expect(state.index).toBe(1);
      expect(Math.abs(state.left), `${id}_GRID_PAGE_ALIGNMENT`).toBeLessThanOrEqual(1);
      expect(state.width).toBeCloseTo(state.viewportWidth, 0);
      expect(state.cards).toEqual(['card-4', 'card-5', 'card-6', 'card-7']);
      expect(new Set(state.all).size).toBe(12);
      break;
    }
    case 'CMT05': {
      await mount(page, { perPage: 2, scrollbar: { hide: true, hideDelay: 50 } }, { count: 8 });
      await page.evaluate(() => {
        const s = (window as unknown as AuditWindow).auditSlider;
        s.scrollTo(7, true);
        s.root.style.width = '960px';
        s.update();
        s.root.dispatchEvent(new MouseEvent('mouseenter'));
      });
      await settle(page);
      await expect(page.locator('#audit-slider .tvist-v1__scrollbar')).not.toHaveClass(
        /tvist-v1__scrollbar--hidden/
      );
      const state = await page.evaluate(() => {
        const s = (window as unknown as AuditWindow).auditSlider;
        const track = s.root.querySelector('.tvist-v1__scrollbar-track')!.getBoundingClientRect();
        const thumb = s.root.querySelector('.tvist-v1__scrollbar-thumb')!.getBoundingClientRect();
        return {
          endGap: track.right - thumb.right,
          width: thumb.width,
          expected: track.width / 4,
          canNext: s.canScrollNext,
        };
      });
      expect(state.canNext).toBe(false);
      expect(Math.abs(state.width - state.expected), 'CMT05_THUMB_SIZE').toBeLessThanOrEqual(1);
      expect(Math.abs(state.endGap), 'CMT05_STALE_END_THUMB_POSITION').toBeLessThanOrEqual(1);
      break;
    }
    case 'CMT06': {
      await mount(page, { perPage: 3, gap: 12, roundLengths: false, speed: 300 });
      await page.evaluate(async () => {
        const w = window as unknown as CommitWindow;
        w.commitEvents = { resized: 0 };
        w.auditSlider.on('resized', () => {
          w.commitEvents!.resized++;
        });
        w.auditSlider.scrollTo(2, true);
        w.auditSlider.next();
        for (const width of [500, 700, 420, 960, 600, 880, 720, 913]) {
          w.auditSlider.root.style.width = `${width}px`;
          await new Promise((resolve) => requestAnimationFrame(resolve));
        }
      });
      await expect
        .poll(
          () =>
            page.evaluate(
              () =>
                (window as unknown as AuditWindow).auditSlider.slides[0]!.getBoundingClientRect()
                  .width
            ),
          { message: 'CMT06_FINAL_LIVE_SIZE', timeout: 3000 }
        )
        .toBeCloseTo((913 - 24) / 3, 1);
      await stableMotion(page);
      const before = await page.evaluate(
        () => (window as unknown as CommitWindow).commitEvents!.resized
      );
      await page.waitForTimeout(250);
      const after = await page.evaluate(
        () => (window as unknown as CommitWindow).commitEvents!.resized
      );
      expect(after, 'CMT06_RESIZE_FEEDBACK_AFTER_SETTLE').toBe(before);
      const geometry = await rects(page);
      expect(
        coverageHoles(geometry.viewport, geometry.slides, 'horizontal', 12),
        'CMT06_FINAL_VIEWPORT_COVERAGE'
      ).toEqual([]);
      await check(page);
      break;
    }
    case 'CMT07': {
      await mount(page, { lazy: { preloadPrevNext: 1 } }, { count: 1 });
      await page.evaluate(() => {
        const s = (window as unknown as AuditWindow).auditSlider;
        const slide = document.createElement('div');
        slide.className = 'tvist-v1__slide';
        slide.style.height = '360px';
        slide.innerHTML =
          '<img id="commit-appended-image" alt="Appended neighbor" width="40" height="40" data-src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7">';
        s.container.append(slide);
        s.update();
      });
      await expect(
        page.locator('#commit-appended-image'),
        'CMT07_LAZY_APPEND_WITHOUT_NAVIGATION'
      ).toHaveAttribute('src', /^data:image\/gif/, { timeout: 1500 });
      expect(
        await page.evaluate(() => (window as unknown as AuditWindow).auditSlider.realIndex)
      ).toBe(0);
      await expect
        .poll(() =>
          page
            .locator('#commit-appended-image')
            .evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)
        )
        .toBe(true);
      break;
    }
    case 'CMT08': {
      await mount(page, { loop: { withClones: true }, perPage: 2 });
      const result = await page.evaluate(() => {
        const s = (window as unknown as AuditWindow).auditSlider;
        const originals = s.slides.filter(
          (slide) => !slide.classList.contains('tvist-v1__slide--clone')
        );
        const ids = originals.map((slide) => slide.dataset.caseId!);
        const before = s.slideCount;
        let active = false;
        const refresh = () => {
          if (!active) {
            active = true;
            s.update();
            active = false;
          }
        };
        s.on('refresh', refresh);
        for (let i = 0; i < 10; i++) s.update();
        s.off('refresh', refresh);
        const after = s.slideCount;
        s.destroy();
        const restored = [
          ...s.container.querySelectorAll<HTMLElement>(':scope > [data-case-id]'),
        ].map((slide) => slide.dataset.caseId!);
        return {
          before,
          after,
          ids,
          restored,
          identities: originals.every((slide) => s.container.contains(slide)),
        };
      });
      expect(result.after, 'CMT08_REENTRANT_CLONE_CARDINALITY').toBe(result.before);
      expect(result.identities, 'CMT08_REENTRANT_ORIGINAL_NODE_IDENTITY').toBe(true);
      expect(
        restoredOriginalErrors(result.ids, result.restored),
        'CMT08_REENTRANT_DESTROY_RESTORE'
      ).toEqual([]);
      break;
    }
    case 'CMT09': {
      await mount(page, {});
      const frozen = await page.evaluate(() => {
        const w = window as unknown as AuditWindow;
        const root = w.auditSlider.root;
        w.auditSlider.destroy();
        w.auditSlider = new w.TvistV1(root, {
          loop: true,
          marquee: { speed: 120, pauseOnHover: false },
          visibility: false,
          speed: 0,
        });
        w.auditSlider.marquee!.stop();
        return getComputedStyle(w.auditSlider.container).transform;
      });
      await page.waitForTimeout(160);
      const result = await page.evaluate(() => {
        const s = (window as unknown as AuditWindow).auditSlider;
        return {
          transform: getComputedStyle(s.container).transform,
          stopped: s.marquee!.isStopped(),
        };
      });
      expect(result.transform, 'CMT09_STALE_FIRST_RAF').toBe(frozen);
      expect(result.stopped).toBe(true);
      break;
    }
    case 'CMT10': {
      await mount(page, { loop: true, marquee: { speed: 120, pauseOnHover: false } });
      await expect
        .poll(
          () =>
            page.evaluate(() =>
              Math.abs(
                new DOMMatrixReadOnly(
                  getComputedStyle(
                    (window as unknown as AuditWindow).auditSlider.container
                  ).transform
                ).m41
              )
            ),
          { message: 'CMT10_MARQUEE_REALLY_STARTED' }
        )
        .toBeGreaterThan(5);
      const stopped = await page.evaluate(() => {
        const s = (window as unknown as AuditWindow).auditSlider;
        s.marquee!.stop();
        return new DOMMatrixReadOnly(getComputedStyle(s.container).transform).m41;
      });
      await page.waitForTimeout(160);
      expect(
        await page.evaluate(
          () =>
            new DOMMatrixReadOnly(
              getComputedStyle((window as unknown as AuditWindow).auditSlider.container).transform
            ).m41
        ),
        'CMT10_STALE_LATER_RAF'
      ).toBeCloseTo(stopped, 1);
      await page.evaluate(() => (window as unknown as AuditWindow).auditSlider.marquee!.start());
      await expect
        .poll(
          () =>
            page.evaluate(
              (before) =>
                Math.abs(
                  new DOMMatrixReadOnly(
                    getComputedStyle(
                      (window as unknown as AuditWindow).auditSlider.container
                    ).transform
                  ).m41 - before
                ),
              stopped
            ),
          { message: 'CMT10_RESTART_WORKS' }
        )
        .toBeGreaterThan(5);
      const final = await page.evaluate(() => {
        const s = (window as unknown as AuditWindow).auditSlider;
        s.destroy();
        return s.container.getAttribute('style');
      });
      await page.waitForTimeout(160);
      expect(
        await page.evaluate(() =>
          (window as unknown as AuditWindow).auditSlider.container.getAttribute('style')
        ),
        'CMT10_DESTROYED_RAF_WRITES'
      ).toBe(final);
      break;
    }
    case 'CMT11': {
      const result = await page.evaluate(() => {
        const w = window as unknown as CommitWindow;
        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'width:800px;height:500px';
        document.body.append(iframe);
        w.commitFrame = iframe;
        const doc = iframe.contentDocument!;
        const style = doc.createElement('style');
        style.textContent = [...document.styleSheets]
          .flatMap((sheet) => {
            try {
              return [...sheet.cssRules].map((rule) => rule.cssText);
            } catch {
              return [];
            }
          })
          .join('\n');
        doc.head.append(style);
        const root = doc.createElement('div');
        root.className = 'tvist-v1';
        root.style.cssText = 'width:720px;height:360px';
        root.innerHTML = `<div class="tvist-v1__track" style="height:360px"><div class="tvist-v1__container">${Array.from({ length: 5 }, (_, i) => `<div class="tvist-v1__slide" style="height:360px">${i}</div>`).join('')}</div></div>`;
        const next = doc.createElement('button');
        next.textContent = 'Next';
        const prev = doc.createElement('button');
        prev.textContent = 'Previous';
        doc.body.append(root, prev, next);
        const ForeignObject = (iframe.contentWindow as unknown as { Object: ObjectConstructor })
          .Object;
        const options = Object.assign(new ForeignObject(), {
          perPage: 2,
          speed: 0,
          visibility: false,
          arrows: { next, prev },
        }) as TvistOptions;
        w.auditSlider = new w.TvistV1(root, options);
        next.click();
        return {
          rootIdentity: w.auditSlider.root === root,
          nextIdentity:
            typeof w.auditSlider.options.arrows === 'object' &&
            w.auditSlider.options.arrows.next === next,
          count: w.auditSlider.slideCount,
          index: w.auditSlider.realIndex,
          perPage: w.auditSlider.options.perPage,
          defaultDirection: w.auditSlider.options.direction,
        };
      });
      expect(result, 'CMT11_CROSS_REALM_DOM_AND_OPTIONS').toEqual({
        rootIdentity: true,
        nextIdentity: true,
        count: 5,
        index: 1,
        perPage: 2,
        defaultDirection: 'horizontal',
      });
      break;
    }
    case 'CMT12': {
      await page.setViewportSize({ width: 1100, height: 900 });
      await mount(page, {
        pagination: false,
        arrows: true,
        breakpoints: { 600: { enabled: false, pagination: false } },
      });
      await page.evaluate(() => {
        const w = window as unknown as AuditWindow;
        const root = w.auditSlider.root;
        w.auditSlider.destroy();
        for (const direction of ['prev', 'next']) {
          const button = document.createElement('button');
          button.id = `commit-author-${direction}`;
          button.textContent = direction;
          button.dataset.author = 'keep';
          document.body.append(button);
        }
        w.auditSlider = new w.TvistV1(root, {
          speed: 0,
          visibility: false,
          pagination: false,
          arrows: { prev: '#commit-author-prev', next: '#commit-author-next' },
          breakpoints: { 600: { enabled: false, pagination: false } },
        });
      });
      for (const width of [500, 1100, 500, 1100]) {
        await page.setViewportSize({ width, height: 900 });
        await expect
          .poll(() => page.evaluate(() => (window as unknown as AuditWindow).auditSlider.isEnabled))
          .toBe(width > 600);
        await expect(
          page.locator('.tvist-v1__pagination'),
          'CMT12_UNEXPECTED_PAGINATION_DOM'
        ).toHaveCount(0);
      }
      await page.locator('#commit-author-next').click();
      expect(
        await page.evaluate(() => (window as unknown as AuditWindow).auditSlider.realIndex)
      ).toBe(1);
      await page.evaluate(() => (window as unknown as AuditWindow).auditSlider.destroy());
      await expect(
        page.locator('button[data-author="keep"]'),
        'CMT12_AUTHOR_CONTROLS_DESTROYED'
      ).toHaveCount(2);
      const before = await page.evaluate(
        () => (window as unknown as AuditWindow).auditSlider.container.style.transform
      );
      await page.evaluate(() => document.getElementById('commit-author-next')!.click());
      expect(
        await page.evaluate(
          () => (window as unknown as AuditWindow).auditSlider.container.style.transform
        ),
        'CMT12_OLD_CONTROL_MOVES_DESTROYED_SLIDER'
      ).toBe(before);
      break;
    }
    default:
      throw new Error(`Unknown commit audit case ${id}`);
  }
}
