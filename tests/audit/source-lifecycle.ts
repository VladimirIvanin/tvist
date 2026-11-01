import { expect, type Page } from '@playwright/test';
import type { Tvist } from '../../src/core/Tvist';
import commits from '../../docs/audit/commits.json';
import { mount, settle, check, type AuditWindow } from './browser-fixture';
import type { AuditCase } from './types';

type SourceWindow = AuditWindow & {
  sourceThumbs?: Tvist;
  sourceMiddle?: Tvist;
  sourceChild?: Tvist;
  sourceEvents?: { starts: number[]; ends: number[]; dragStarts: number; dragEnds: number };
  sourceCloneEvidence?: unknown;
};
const source = (id: number): string => {
  const record = commits.find((commit) => commit.id === `COMMIT-${id}`);
  if (!record) throw new Error(`Missing researched commit ${id}`);
  return record.url;
};

export const sourceLifecycleCases: AuditCase[] = [
  {
    id: 'SRC-L01',
    title:
      'Dynamic focusable descendants preserve author tabindex through hidden reveal and lifecycle',
    family: 'source-lifecycle',
    priority: 'P1',
    sources: [source(4)],
  },
  {
    id: 'SRC-L02',
    title: 'Native image drag releases over arrow button, SVG and image descendants',
    family: 'source-lifecycle',
    priority: 'P0',
    sources: [source(5), 'https://github.com/Splidejs/splide/issues/408'],
  },
  {
    id: 'SRC-L03',
    title: 'Press and release interrupts a seam transition without a second loop displacement',
    family: 'source-lifecycle',
    priority: 'P0',
    sources: [source(8)],
  },
  {
    id: 'SRC-L04',
    title: 'Explicit group differs from perPage at forward and reverse loop seams',
    family: 'source-lifecycle',
    priority: 'P0',
    sources: [source(11)],
  },
  {
    id: 'SRC-L05',
    title: 'Loop coordinate compensation emits one logical change per seam or far navigation',
    family: 'source-lifecycle',
    priority: 'P0',
    sources: [source(19)],
  },
  {
    id: 'SRC-L06',
    title:
      'Two looping sliders preserve clicked thumbnail identity after two cycles and reverse seam',
    family: 'source-lifecycle',
    priority: 'P0',
    sources: [source(21)],
  },
  {
    id: 'SRC-L07',
    title:
      'Three nested levels isolate body-crossing drag with both complete initialization orders',
    family: 'source-lifecycle',
    priority: 'P0',
    sources: [source(23)],
  },
  {
    id: 'SRC-L08',
    title:
      'Visible nested loop clones expose the instance lifecycle contract after working original reorder',
    family: 'source-lifecycle',
    priority: 'P1',
    sources: ['https://github.com/Splidejs/splide/issues/561'],
  },
];

async function index(page: Page): Promise<number> {
  return page.evaluate(() => (window as unknown as AuditWindow).auditSlider.realIndex);
}
async function move(page: Page, action: 'next' | 'prev' | number): Promise<void> {
  await page.evaluate((action) => {
    const slider = (window as unknown as AuditWindow).auditSlider;
    if (typeof action === 'number') slider.scrollTo(action, true);
    else slider[action]();
  }, action);
  await settle(page);
}
async function position(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      new DOMMatrixReadOnly(
        getComputedStyle((window as unknown as AuditWindow).auditSlider.container).transform
      ).m41
  );
}

export async function runSourceLifecycleCase(page: Page, id: string): Promise<void> {
  switch (id) {
    case 'SRC-L01': {
      await mount(
        page,
        { focusableElements: 'input,textarea,select,[tabindex]', arrows: true },
        { count: 5 }
      );
      await page.evaluate(() => {
        const slider = (window as unknown as AuditWindow).auditSlider;
        const slide = slider.slides[3]!;
        slide.style.visibility = 'hidden';
        slide.innerHTML =
          '<a id="source-dynamic-link" href="#source-focus" tabindex="5" style="display:block;width:240px;height:80px">New author link</a><button id="source-dynamic-button" tabindex="-1">Author button</button>';
        slider.update();
      });
      // Tvist has no A11y module: this asserts preservation and dynamic drag exclusion,
      // not automatic tabindex/aria-hidden management of offscreen slides.
      await expect(page.locator('#source-dynamic-link')).toHaveAttribute('tabindex', '5');
      await page.evaluate(() => {
        const slider = (window as unknown as AuditWindow).auditSlider;
        slider.slides[3]!.style.visibility = '';
        slider.update();
        slider.scrollTo(3, true);
      });
      await settle(page);
      const link = page.locator('#source-dynamic-link');
      await expect(link).toBeVisible();
      await link.focus();
      const box = (await link.boundingBox())!;
      const before = await position(page);
      await page.mouse.move(box.x + 210, box.y + 30);
      await page.mouse.down();
      await page.mouse.move(box.x + 30, box.y + 30, { steps: 12 });
      await page.mouse.up();
      await settle(page);
      expect(await position(page), 'SRC_L01_DYNAMIC_FOCUSABLE_MUST_NOT_DRAG').toBeCloseTo(
        before,
        1
      );
      expect(await index(page)).toBe(3);
      for (let cycle = 0; cycle < 3; cycle++) {
        await page.evaluate(() => {
          const slider = (window as unknown as AuditWindow).auditSlider;
          slider.disable();
          slider.enable();
          slider.update();
        });
        await expect(link, 'SRC_L01_AUTHOR_POSITIVE_TABINDEX').toHaveAttribute('tabindex', '5');
        await expect(
          page.locator('#source-dynamic-button'),
          'SRC_L01_AUTHOR_NEGATIVE_TABINDEX'
        ).toHaveAttribute('tabindex', '-1');
      }
      await page.evaluate(() => (window as unknown as AuditWindow).auditSlider.destroy());
      await expect(link).toHaveAttribute('tabindex', '5');
      await expect(page.locator('#source-dynamic-button')).toHaveAttribute('tabindex', '-1');
      break;
    }
    case 'SRC-L02': {
      const image =
        '<img alt="Native draggable card image" draggable="true" width="300" height="200" style="display:block;margin-left:200px" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7">';
      await mount(
        page,
        { arrows: true, flickMaxPages: 1 },
        { count: 6, contents: Array.from({ length: 6 }, () => image) }
      );
      await page.evaluate(() => {
        const w = window as unknown as SourceWindow;
        w.sourceEvents = { starts: [], ends: [], dragStarts: 0, dragEnds: 0 };
        w.auditSlider.on('dragStart', () => w.sourceEvents!.dragStarts++);
        w.auditSlider.on('dragEnd', () => w.sourceEvents!.dragEnds++);
      });
      for (const target of ['button', 'svg', 'image']) {
        await move(page, 2);
        await page.evaluate((target) => {
          const w = window as unknown as SourceWindow;
          w.sourceEvents!.dragStarts = 0;
          w.sourceEvents!.dragEnds = 0;
          const button =
            w.auditSlider.root.querySelector<HTMLButtonElement>('.tvist-v1__arrow--prev')!;
          button.style.cssText =
            'position:absolute;left:16px;top:100px;width:80px;height:80px;transform:none;z-index:20';
          button.innerHTML =
            target === 'svg'
              ? '<svg id="source-release-target" width="60" height="60" viewBox="0 0 60 60"><rect width="60" height="60" fill="black"/></svg>'
              : target === 'image'
                ? '<img id="source-release-target" alt="Arrow image" width="60" height="60" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7">'
                : 'Previous';
        }, target);
        const imageBox = (await page
          .locator('#audit-slider [data-case-id="card-2"] > img')
          .boundingBox())!;
        const destination =
          target === 'button'
            ? page.locator('#audit-slider .tvist-v1__arrow--prev')
            : page.locator('#source-release-target');
        const targetBox = (await destination.boundingBox())!;
        await page.mouse.move(imageBox.x + 270, imageBox.y + 100);
        await page.mouse.down();
        await page.mouse.move(
          targetBox.x + targetBox.width / 2,
          targetBox.y + targetBox.height / 2,
          { steps: 16 }
        );
        await page.mouse.up();
        await settle(page);
        const counters = await page.evaluate(() => {
          const events = (window as unknown as SourceWindow).sourceEvents!;
          return { starts: events.dragStarts, ends: events.dragEnds };
        });
        expect(counters, `SRC_L02_${target}_BALANCED_NATIVE_GESTURE`).toEqual({
          starts: 1,
          ends: 1,
        });
        expect(await index(page), `SRC_L02_${target}_NO_ACCIDENTAL_PREV_CLICK`).toBe(3);
        const stopped = await position(page);
        await page.mouse.move(620, 240, { steps: 8 });
        expect(await position(page), `SRC_L02_${target}_NO_LATCHED_DRAG`).toBeCloseTo(stopped, 1);
        await page.locator('#audit-slider .tvist-v1__arrow--next').click();
        await settle(page);
        expect(await index(page), `SRC_L02_${target}_NEXT_CLICK_STILL_WORKS`).toBe(4);
      }
      break;
    }
    case 'SRC-L03': {
      for (const clones of [false, true]) {
        await mount(page, { loop: clones ? { withClones: true } : true, speed: 650 }, { count: 7 });
        await move(page, 6);
        await page.evaluate(() => (window as unknown as AuditWindow).auditSlider.next());
        await page.waitForFunction(() => {
          const slider = (window as unknown as AuditWindow).auditSlider;
          const active = slider.slides[slider.activeIndex]!.getBoundingClientRect();
          return (
            slider.container.style.transition &&
            Math.abs(active.left - slider.track.getBoundingClientRect().left) > 20
          );
        });
        const box = (await page.locator('#audit-slider > .tvist-v1__track').boundingBox())!;
        await page.mouse.move(box.x + 350, box.y + 200);
        await page.mouse.down();
        const held = await position(page);
        await page.evaluate(
          () =>
            new Promise<void>((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
            )
        );
        expect(await position(page), `SRC_L03_${clones}_PRESS_FREEZES_SEAM`).toBeCloseTo(held, 1);
        await page.mouse.up();
        await settle(page);
        const interruptedIndex = await index(page);
        if (interruptedIndex !== 0)
          throw new Error(
            `CONTRACT_GAP: SRC_L03_${clones}_INTERRUPTED_TARGET requested=0 actual=${interruptedIndex}; Drag resumes a saved DOM index through public logical scrollTo, but the public contract does not specify resume-target versus nearest-snap after a stationary press/release. Later assertions were not executed.`
          );
        await check(page);
        const final = await position(page);
        await page.waitForTimeout(700);
        expect(await position(page), `SRC_L03_${clones}_NO_DELAYED_LOOP_SHIFT`).toBeCloseTo(
          final,
          1
        );
        await move(page, 'prev');
        expect(await index(page), `SRC_L03_${clones}_REVERSE_AFTER_CANCELLATION`).toBe(6);
      }
      break;
    }
    case 'SRC-L04': {
      await mount(page, { loop: true, perPage: 3, slidesPerGroup: 2 }, { count: 7 });
      await move(page, 5);
      const actual: number[] = [];
      for (const action of ['next', 'next', 'prev', 'prev', 'prev', 'next'] as const) {
        await move(page, action);
        actual.push(await index(page));
      }
      expect(actual, 'SRC_L04_EXPLICIT_GROUP_NOT_PERPAGE_ALIGNMENT').toEqual([0, 2, 0, 5, 3, 5]);
      await check(page);
      break;
    }
    case 'SRC-L05': {
      await mount(page, { loop: true, perPage: 2, speed: 80 }, { count: 7 });
      await page.evaluate(() => {
        const w = window as unknown as SourceWindow;
        w.sourceEvents = { starts: [], ends: [], dragStarts: 0, dragEnds: 0 };
        w.auditSlider.on('slideChangeStart', (logical) => w.sourceEvents!.starts.push(logical));
        w.auditSlider.on('slideChangeEnd', (logical) => w.sourceEvents!.ends.push(logical));
      });
      const orders: string[] = [
        await page.evaluate(() =>
          (window as unknown as AuditWindow).auditSlider.slides
            .map((slide) => slide.dataset.caseId)
            .join(',')
        ),
      ];
      for (const [action, expected] of [
        ['prev', 6],
        ['next', 0],
        [5, 5],
        ['next', 6],
        ['next', 0],
        [1, 1],
        ['prev', 0],
        ['prev', 6],
      ] as const) {
        await page.evaluate(() => {
          const events = (window as unknown as SourceWindow).sourceEvents!;
          events.starts = [];
          events.ends = [];
        });
        // Use animated scrollTo here: instant jumps intentionally follow another event path.
        await page.evaluate((action) => {
          const slider = (window as unknown as AuditWindow).auditSlider;
          if (typeof action === 'number') slider.scrollTo(action);
          else slider[action]();
        }, action);
        await settle(page);
        const result = await page.evaluate(() => {
          const w = window as unknown as SourceWindow;
          return {
            starts: w.sourceEvents!.starts,
            ends: w.sourceEvents!.ends,
            logical: w.auditSlider.realIndex,
            order: w.auditSlider.slides.map((slide) => slide.dataset.caseId).join(','),
          };
        });
        expect(result.logical, 'SRC_L05_REQUESTED_LOGICAL_INDEX').toBe(expected);
        expect(result.starts, 'SRC_L05_NO_COMPENSATION_START_EVENTS').toEqual([expected]);
        expect(result.ends, 'SRC_L05_NO_COMPENSATION_END_EVENTS').toEqual([expected]);
        orders.push(result.order);
      }
      expect(new Set(orders).size, 'SRC_L05_REAL_DOM_COMPENSATION_EXERCISED').toBeGreaterThan(1);
      await check(page);
      break;
    }
    case 'SRC-L06': {
      await mount(page, { loop: true }, { count: 7 });
      await page.evaluate(() => {
        const w = window as unknown as SourceWindow;
        const root = document.createElement('div');
        root.id = 'source-thumbs';
        root.className = 'tvist-v1';
        root.style.cssText = 'width:720px;height:120px;margin-top:20px';
        root.innerHTML = `<div class="tvist-v1__track" style="height:120px"><div class="tvist-v1__container">${Array.from({ length: 7 }, (_, i) => `<div class="tvist-v1__slide" data-source-thumb-index="${i}" style="height:120px">Thumb ${i}</div>`).join('')}</div></div>`;
        document.body.append(root);
        w.sourceThumbs = new w.TvistV1(root, {
          loop: true,
          perPage: 3,
          isNavigation: true,
          speed: 0,
          visibility: false,
        });
        w.auditSlider.sync(w.sourceThumbs);
      });
      for (let step = 0; step < 14; step++) await move(page, 'next');
      expect(await index(page), 'SRC_L06_TWO_MAIN_LOOP_CYCLES').toBe(0);
      await move(page, 'prev');
      expect(await index(page), 'SRC_L06_REVERSE_SEAM').toBe(6);
      const target = await page.evaluate(() => {
        const slider = (window as unknown as SourceWindow).sourceThumbs!;
        const track = slider.track.getBoundingClientRect();
        const visible = slider.slides.filter((slide) => {
          const rect = slide.getBoundingClientRect();
          const middle = (rect.left + rect.right) / 2;
          return (
            middle > track.left && middle < track.right && slide.dataset.sourceThumbIndex !== '6'
          );
        });
        return Number(visible[0]?.dataset.sourceThumbIndex);
      });
      expect(Number.isFinite(target), 'SRC_L06_VISIBLE_DIFFERENT_THUMB_FIXTURE').toBe(true);
      await page.locator(`#source-thumbs [data-source-thumb-index="${target}"]`).click();
      await settle(page);
      const result = await page.evaluate(() => {
        const w = window as unknown as SourceWindow;
        return {
          main: w.auditSlider.realIndex,
          thumbs: w.sourceThumbs!.realIndex,
          selected: [
            ...w.sourceThumbs!.root.querySelectorAll<HTMLElement>('.tvist-v1__slide--nav-active'),
          ].map((slide) => Number(slide.dataset.sourceThumbIndex)),
        };
      });
      expect(result, 'SRC_L06_PREVIOUS_DOM_INDEX_MUST_NOT_REPLACE_LOGICAL_IDENTITY').toEqual({
        main: target,
        thumbs: target,
        selected: [target],
      });
      break;
    }
    case 'SRC-L07': {
      for (const deepestFirst of [false, true]) {
        await page.evaluate((deepestFirst) => {
          const w = window as unknown as SourceWindow;
          w.auditSlider?.destroy({ destroyNested: true });
          document.body.replaceChildren();
          const create = (id: string, width: number, height: number) => {
            const root = document.createElement('div');
            root.id = id;
            root.className = 'tvist-v1';
            root.style.cssText = `width:${width}px;height:${height}px`;
            root.innerHTML = `<div class="tvist-v1__track" style="height:${height}px"><div class="tvist-v1__container">${Array.from({ length: 4 }, (_, i) => `<div class="tvist-v1__slide" style="height:${height}px">${id} ${i}</div>`).join('')}</div></div>`;
            return root;
          };
          const outer = create('audit-slider', 900, 480);
          outer.style.marginLeft = '120px';
          const middle = create('source-middle', 650, 320);
          const child = create('source-child', 400, 180);
          outer.querySelector('.tvist-v1__slide')!.replaceChildren(middle);
          middle.querySelector('.tvist-v1__slide')!.replaceChildren(child);
          document.body.append(outer);
          const options = { speed: 0, visibility: false };
          if (deepestFirst) {
            w.sourceChild = new w.TvistV1(child, options);
            w.sourceMiddle = new w.TvistV1(middle, options);
            w.auditSlider = new w.TvistV1(outer, options);
          } else {
            w.auditSlider = new w.TvistV1(outer, options);
            w.sourceMiddle = new w.TvistV1(middle, options);
            w.sourceChild = new w.TvistV1(child, options);
          }
          w.auditOriginals = [...w.auditSlider.slides];
        }, deepestFirst);
        await settle(page);
        const child = (await page.locator('#source-child > .tvist-v1__track').boundingBox())!;
        const y = child.y + 70;
        await page.mouse.move(child.x + child.width * 0.8, y);
        await page.mouse.down();
        await page.mouse.move(20, y, { steps: 16 });
        expect(
          await page.evaluate(
            (y) =>
              !document.getElementById('audit-slider')!.contains(document.elementFromPoint(20, y)),
            y
          ),
          'SRC_L07_MOVE_REALLY_LEAVES_ALL_ROOTS'
        ).toBe(true);
        await page.mouse.up();
        await settle(page);
        const read = () =>
          page.evaluate(() => {
            const w = window as unknown as SourceWindow;
            return [w.auditSlider.realIndex, w.sourceMiddle!.realIndex, w.sourceChild!.realIndex];
          });
        const released = await read();
        expect(released.slice(0, 2), `SRC_L07_${deepestFirst}_DOCUMENT_LISTENER_ISOLATION`).toEqual(
          [0, 0]
        );
        expect(released[2], `SRC_L07_${deepestFirst}_CHILD_DRAG_REALLY_MOVED`).toBeGreaterThan(0);
        await page.mouse.move(700, y, { steps: 8 });
        expect(await read(), `SRC_L07_${deepestFirst}_NO_DOCUMENT_DRAG_AFTER_RELEASE`).toEqual(
          released
        );
        const outer = (await page.locator('#audit-slider > .tvist-v1__track').boundingBox())!;
        await page.mouse.move(outer.x + 700, outer.y + 420);
        await page.mouse.down();
        await page.mouse.move(outer.x + 250, outer.y + 420, { steps: 12 });
        await page.mouse.up();
        await settle(page);
        const parentMoved = await read();
        expect(
          parentMoved[0],
          `SRC_L07_${deepestFirst}_ANCESTOR_GESTURE_STILL_WORKS`
        ).toBeGreaterThan(0);
        expect(
          parentMoved.slice(1),
          `SRC_L07_${deepestFirst}_PARENT_MUST_NOT_MOVE_DESCENDANTS`
        ).toEqual(released.slice(1));
      }
      break;
    }
    case 'SRC-L08': {
      const setup = async (mode: 'reorder' | 'explicit' | 'fallback', childFirst: boolean) => {
        await page.evaluate(
          ({ mode, childFirst }) => {
            const w = window as unknown as SourceWindow;
            w.auditSlider?.destroy({ destroyNested: true });
            document.body.replaceChildren();
            const count = mode === 'fallback' ? 3 : 7;
            const root = document.createElement('div');
            root.id = 'audit-slider';
            root.className = 'tvist-v1';
            root.style.cssText = 'width:720px;height:360px';
            root.innerHTML = `<div class="tvist-v1__track" style="height:360px"><div class="tvist-v1__container">${Array.from({ length: count }, (_, i) => `<div class="tvist-v1__slide" data-case-id="card-${i}" style="height:360px">Parent ${i}</div>`).join('')}</div></div>`;
            const child = document.createElement('div');
            child.className = 'tvist-v1';
            child.dataset.sourceNested = 'child';
            const width = mode === 'fallback' ? 260 : 400;
            child.style.cssText = `width:${width}px;height:180px;margin-top:40px`;
            child.innerHTML = `<div class="tvist-v1__track" style="height:180px"><div class="tvist-v1__container">${Array.from({ length: 4 }, (_, i) => `<div class="tvist-v1__slide" style="height:180px">Inner ${i}</div>`).join('')}</div></div>`;
            root.querySelector('.tvist-v1__slide')!.replaceChildren(child);
            document.body.append(root);
            w.auditOriginals = [
              ...root.querySelectorAll<HTMLElement>(
                ':scope > .tvist-v1__track > .tvist-v1__container > .tvist-v1__slide'
              ),
            ];
            const makeChild = () => {
              w.sourceChild = new w.TvistV1(child, { arrows: true, speed: 0, visibility: false });
            };
            if (childFirst) makeChild();
            w.auditSlider = new w.TvistV1(root, {
              loop: mode === 'explicit' ? { withClones: true } : true,
              perPage: mode === 'fallback' ? 2 : 1,
              speed: mode === 'reorder' ? 50 : 3000,
              visibility: false,
            });
            if (!childFirst) makeChild();
          },
          { mode, childFirst }
        );
        await settle(page);
      };
      await setup('reorder', true);
      const orders = new Set<string>();
      for (let step = 0; step < 7; step++) {
        await move(page, 'next');
        orders.add(
          await page.evaluate(() =>
            (window as unknown as AuditWindow).auditSlider.slides
              .map((slide) => slide.dataset.caseId)
              .join(',')
          )
        );
      }
      expect(orders.size, 'SRC_L08_ORIGINAL_REORDER_REALLY_EXERCISED').toBeGreaterThan(1);
      await page
        .locator(
          '#audit-slider > .tvist-v1__track > .tvist-v1__container > .tvist-v1__slide [data-source-nested="child"] > .tvist-v1__arrow--next'
        )
        .click();
      const original = await page.evaluate(() => {
        const w = window as unknown as SourceWindow;
        return {
          childIndex: w.sourceChild!.realIndex,
          parentIndex: w.auditSlider.realIndex,
          connected: w.sourceChild!.root.isConnected,
          sameInstance:
            (w.sourceChild!.root as HTMLElement & { tvistInstance?: Tvist }).tvistInstance ===
            w.sourceChild,
          clones: w.auditSlider.slides.filter((slide) =>
            slide.classList.contains('tvist-v1__slide--clone')
          ).length,
        };
      });
      expect(original, 'SRC_L08_REORDER_PRESERVES_WORKING_ORIGINAL_CHILD').toEqual({
        childIndex: 1,
        parentIndex: 0,
        connected: true,
        sameInstance: true,
        clones: 0,
      });

      const observations: Array<Record<string, unknown>> = [];
      for (const [mode, childFirst] of [
        ['explicit', true],
        ['explicit', false],
        ['fallback', true],
      ] as const) {
        await setup(mode, childFirst);
        await move(page, mode === 'fallback' ? 2 : 6);
        await page.evaluate(() => (window as unknown as AuditWindow).auditSlider.next());
        // Capture geometry and activation in the same animation frame. The DOM click
        // deliberately observes the cloned control listener without racing a moving pointer target.
        const visible = await page.waitForFunction(
          () => {
            const w = window as unknown as SourceWindow;
            const slider = w.auditSlider;
            if (
              !slider.container
                .getAnimations()
                .some((animation) => animation.playState === 'running')
            )
              return false;
            const viewport = slider.track.getBoundingClientRect();
            for (const slide of slider.slides) {
              if (!slide.classList.contains('tvist-v1__slide--clone')) continue;
              const child = slide.querySelector<HTMLElement>('[data-source-nested="child"]');
              if (!child) continue;
              const rect = child.getBoundingClientRect();
              const visibleWidth = Math.max(
                0,
                Math.min(rect.right, viewport.right) - Math.max(rect.left, viewport.left)
              );
              const visibleHeight = Math.max(
                0,
                Math.min(rect.bottom, viewport.bottom) - Math.max(rect.top, viewport.top)
              );
              if (visibleWidth < 120 || visibleHeight < 100) continue;
              const instance = (child as HTMLElement & { tvistInstance?: Tvist }).tvistInstance;
              const control = child.querySelector<HTMLButtonElement>(
                ':scope > .tvist-v1__arrow--next'
              );
              const container = child.querySelector<HTMLElement>(
                ':scope > .tvist-v1__track > .tvist-v1__container'
              )!;
              const before = getComputedStyle(container).transform;
              const instanceIndexBefore = instance?.realIndex;
              control?.click();
              slide.dataset.sourceObservedClone = 'true';
              return {
                parentIndex: slider.realIndex,
                slideLogicalIndex: slide.getAttribute('data-tvist-slide-index'),
                transitionRunning: true,
                viewport: {
                  left: viewport.left,
                  right: viewport.right,
                  top: viewport.top,
                  bottom: viewport.bottom,
                },
                childRect: {
                  left: rect.left,
                  right: rect.right,
                  top: rect.top,
                  bottom: rect.bottom,
                },
                visibleWidth,
                visibleHeight,
                originalNode: child === w.sourceChild!.root,
                hasInstance: Boolean(instance),
                copiedControls: child.querySelectorAll(':scope > .tvist-v1__arrow').length,
                nextControlPresent: Boolean(control),
                controlActivation: 'DOM click during boundary transition',
                instanceIndexBefore,
                instanceIndexAfter: instance?.realIndex,
                transformBefore: before,
                transformAfter: getComputedStyle(container).transform,
                originalChildIndex: w.sourceChild!.realIndex,
              };
            }
            return false;
          },
          undefined,
          { timeout: 6000 }
        );
        const observation = await visible.jsonValue();
        await visible.dispose();
        if (!observation) throw new Error('SRC_L08_HARNESS_MISSING_VISIBLE_CLONE_SAMPLE');
        expect(observation.originalNode, 'SRC_L08_VISIBLE_NODE_MUST_BE_A_CLONE').toBe(false);
        observations.push({ mode, childFirst, ...observation });
      }
      const evidence = {
        originalReorder: original,
        observedOriginalOrders: orders.size,
        visibleClones: observations,
      };
      await page.evaluate((evidence) => {
        (window as unknown as SourceWindow).sourceCloneEvidence = evidence;
      }, evidence);
      if (observations.some((observation) => observation.hasInstance === false)) {
        throw new Error(
          `CONTRACT_GAP: nested-clone instance lifecycle is not specified; a DOM-visible clone during a running boundary transition has no JavaScript instance. Automatic child-instance replication is not asserted as an existing Tvist guarantee. ${JSON.stringify(evidence)}`
        );
      }
      break;
    }
    default:
      throw new Error(`Unknown source lifecycle case ${id}`);
  }
}
