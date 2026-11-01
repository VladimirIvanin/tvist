import { expect, type Page } from '@playwright/test';
import type { Tvist } from '../../src/core/Tvist';
import { mount, settle, check } from './browser-fixture';

type AuditWindow = Window & {
  TvistV1: typeof Tvist;
  auditSlider: Tvist;
  auditThumbs?: Tvist;
  auditMiddle?: Tvist;
  auditChild?: Tvist;
  auditClicks?: number[];
  auditCounts?: Record<string, number>;
};

const source = (project: 'swiper' | 'splide', issue: number): string =>
  `https://github.com/${project === 'swiper' ? 'nolimits4web/swiper' : 'Splidejs/splide'}/issues/${issue}`;

export const inputCases: Array<{
  id: string;
  title: string;
  family: string;
  priority: 'P0' | 'P1' | 'P2';
  sources: string[];
}> = [
  {
    id: 'IN01',
    title: 'Synthetic pointercancel releases an active slide drag',
    family: 'gestures',
    priority: 'P0',
    sources: [source('splide', 1365)],
  },
  {
    id: 'IN02',
    title: 'Synthetic foreign pointer cannot move or finish another pointer drag',
    family: 'gestures',
    priority: 'P0',
    sources: [],
  },
  {
    id: 'IN03',
    title: 'Perpendicular real mouse drag leaves the horizontal slider unchanged',
    family: 'gestures',
    priority: 'P1',
    sources: [source('splide', 1365)],
  },
  {
    id: 'IN04',
    title: 'Disabling during real drag releases the old gesture',
    family: 'gestures',
    priority: 'P0',
    sources: [],
  },
  {
    id: 'IN05',
    title: 'Synthetic cancellation ends a real long press and releases autoplay pause',
    family: 'gestures',
    priority: 'P0',
    sources: [],
  },
  {
    id: 'IN06',
    title: 'Real drag suppresses its link click but the next ordinary click works',
    family: 'gestures',
    priority: 'P1',
    sources: [source('swiper', 8118)],
  },
  {
    id: 'IN07',
    title: 'Custom focusableElements protects form controls and nested button content',
    family: 'gestures',
    priority: 'P1',
    sources: [source('splide', 1260)],
  },
  {
    id: 'IN08',
    title: 'Cloned loop click payload identifies the logical slide',
    family: 'events',
    priority: 'P0',
    sources: [source('splide', 1260)],
  },
  {
    id: 'CT01',
    title: 'Synthetic rapid wheel events release scrolling at both boundaries',
    family: 'controls',
    priority: 'P0',
    sources: [],
  },
  {
    id: 'CT02',
    title: 'Real wheel at a slider boundary scrolls its page',
    family: 'controls',
    priority: 'P1',
    sources: [],
  },
  {
    id: 'CT03',
    title: 'Synthetic pointercancel releases a real scrollbar drag',
    family: 'controls',
    priority: 'P0',
    sources: [],
  },
  {
    id: 'CT04',
    title: 'Scrollbar draggable false to true to false changes actual input behavior',
    family: 'controls',
    priority: 'P0',
    sources: [],
  },
  {
    id: 'CT05',
    title: 'Scrollbar custom container can be replaced through updateOptions',
    family: 'controls',
    priority: 'P1',
    sources: [],
  },
  {
    id: 'SY01',
    title: 'Documented thumbs option synchronizes without an additional sync call',
    family: 'sync',
    priority: 'P0',
    sources: [source('swiper', 8118)],
  },
  {
    id: 'SY02',
    title: 'Reordered loop thumbnail click uses its logical identity',
    family: 'sync',
    priority: 'P0',
    sources: [source('splide', 649)],
  },
  {
    id: 'SY03',
    title: 'Sync remains usable across thumbnail disable and enable',
    family: 'sync',
    priority: 'P0',
    sources: [source('splide', 1268)],
  },
  {
    id: 'SY04',
    title: 'syncOnDrag false preserves main position and allows a subsequent thumbnail click',
    family: 'sync',
    priority: 'P1',
    sources: [source('swiper', 8118)],
  },
  {
    id: 'SY05',
    title: 'Three nested sliders isolate real drag and retain children after parent destroy',
    family: 'sync',
    priority: 'P0',
    sources: [source('swiper', 7702)],
  },
  {
    id: 'LC01',
    title: 'Documented appendChild plus update refreshes the public slide collection',
    family: 'lifecycle',
    priority: 'P0',
    sources: [source('swiper', 3846)],
  },
  {
    id: 'LC02',
    title: 'Removing the active DOM slide then update yields a live reachable collection',
    family: 'lifecycle',
    priority: 'P0',
    sources: [],
  },
  {
    id: 'LC03',
    title: 'Runtime display:none filtering and update remove hidden slides from navigation',
    family: 'lifecycle',
    priority: 'P0',
    sources: [source('swiper', 8065)],
  },
  {
    id: 'LC04',
    title: 'Replacing an instance during a drag prevents old input from moving the replacement',
    family: 'lifecycle',
    priority: 'P0',
    sources: [source('swiper', 8036)],
  },
  {
    id: 'LC05',
    title: 'Twenty control activation cycles retain exactly one action per click',
    family: 'lifecycle',
    priority: 'P1',
    sources: [source('swiper', 6263)],
  },
  {
    id: 'EV01',
    title: 'A bounded reentrant emit cannot call a once handler more than once',
    family: 'events',
    priority: 'P0',
    sources: [],
  },
  {
    id: 'EV02',
    title: 'Destroy inside slideChangeStart leaves no active transition or later callbacks',
    family: 'events',
    priority: 'P0',
    sources: [source('swiper', 8036)],
  },
  {
    id: 'EV03',
    title: 'Replacing option event handlers removes the old handler without duplicates',
    family: 'events',
    priority: 'P1',
    sources: [],
  },
];

async function drag(page: Page, selector: string, dx: number, dy = 0): Promise<void> {
  const rect = await page.locator(selector).boundingBox();
  expect(rect, `INPUT_FIXTURE: ${selector} must have a bounding box`).not.toBeNull();
  const x = rect!.x + rect!.width * (dx < 0 ? 0.8 : 0.2);
  const y = rect!.y + rect!.height * 0.35;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 12 });
  await page.mouse.up();
  await settle(page);
}

async function position(page: Page, selector = '#audit-slider'): Promise<number> {
  return page.locator(selector).evaluate((root) => {
    const container = root.querySelector<HTMLElement>(
      ':scope > .tvist-v1__track > .tvist-v1__container'
    )!;
    return new DOMMatrixReadOnly(getComputedStyle(container).transform).m41;
  });
}

async function pair(
  page: Page,
  settings: { optionOnly?: boolean; loop?: boolean; syncOnDrag?: boolean } = {}
): Promise<void> {
  await mount(page, { speed: 0, visibility: false, drag: true });
  await page.evaluate((settings) => {
    const w = window as unknown as AuditWindow;
    const root = document.createElement('div');
    root.id = 'audit-thumbs';
    root.className = 'tvist-v1';
    root.style.cssText = 'width:720px;height:140px;margin-top:20px';
    root.innerHTML = `<div class="tvist-v1__track" style="height:140px"><div class="tvist-v1__container">${Array.from({ length: 7 }, (_, i) => `<div class="tvist-v1__slide" data-case-id="${i}" style="height:140px">Thumb ${i}</div>`).join('')}</div></div>`;
    document.body.append(root);
    const thumbs = new w.TvistV1(root, {
      perPage: 3,
      speed: 0,
      visibility: false,
      isNavigation: true,
      loop: settings.loop ?? false,
      syncOnDrag: settings.syncOnDrag ?? true,
    });
    w.auditThumbs = thumbs;
    if (settings.optionOnly) {
      const mainRoot = w.auditSlider.root;
      w.auditSlider.destroy();
      w.auditSlider = new w.TvistV1(mainRoot, {
        speed: 0,
        visibility: false,
        thumbs: { slider: thumbs },
      });
    } else {
      w.auditSlider.sync(thumbs);
    }
  }, settings);
  await settle(page);
}

async function thumbIndex(page: Page): Promise<number> {
  return page.evaluate(() => (window as unknown as AuditWindow).auditThumbs!.realIndex);
}

async function mainIndex(page: Page): Promise<number> {
  return page.evaluate(() => (window as unknown as AuditWindow).auditSlider.realIndex);
}

/** Every case runs against public APIs and rendered DOM of the browser distribution. */
export async function runInputCase(page: Page, id: string): Promise<void> {
  switch (id) {
    case 'IN01': {
      await mount(page, { speed: 0, visibility: false });
      await page.evaluate(() => {
        const w = window as unknown as AuditWindow;
        const root = w.auditSlider.root;
        const box = root.getBoundingClientRect();
        const send = (target: EventTarget, type: string, x: number) =>
          target.dispatchEvent(
            new PointerEvent(type, {
              bubbles: true,
              cancelable: true,
              pointerId: 41,
              pointerType: 'touch',
              isPrimary: true,
              button: 0,
              clientX: x,
              clientY: box.top + 50,
            })
          );
        send(root, 'pointerdown', box.left + 500);
        send(document, 'pointermove', box.left + 440);
        send(document, 'pointermove', box.left + 300);
        send(document, 'pointercancel', box.left + 300);
      });
      await settle(page);
      await expect(page.locator('#audit-slider'), 'IN01_CANCEL_DRAG_CLASS').not.toHaveClass(
        /tvist-v1--dragging/
      );
      const before = await position(page);
      await page.evaluate(() =>
        document.dispatchEvent(
          new PointerEvent('pointermove', {
            bubbles: true,
            pointerId: 41,
            pointerType: 'touch',
            clientX: 40,
            clientY: 50,
          })
        )
      );
      expect(await position(page), 'IN01_CANCEL_STALE_MOVE').toBeCloseTo(before, 1);
      await drag(page, '#audit-slider .tvist-v1__track', -420);
      await check(page);
      break;
    }
    case 'IN02': {
      await mount(page, { speed: 0, visibility: false });
      const result = await page.evaluate(() => {
        const slider = (window as unknown as AuditWindow).auditSlider;
        const b = slider.root.getBoundingClientRect();
        const send = (target: EventTarget, type: string, pointerId: number, x: number) =>
          target.dispatchEvent(
            new PointerEvent(type, {
              bubbles: true,
              cancelable: true,
              pointerId,
              pointerType: 'touch',
              isPrimary: pointerId === 1,
              button: 0,
              clientX: b.left + x,
              clientY: b.top + 80,
            })
          );
        const x = () => new DOMMatrixReadOnly(getComputedStyle(slider.container).transform).m41;
        send(slider.root, 'pointerdown', 1, 600);
        send(document, 'pointermove', 1, 560);
        send(document, 'pointermove', 1, 460);
        const beforeForeign = x();
        send(document, 'pointermove', 2, 100);
        const afterForeign = x();
        send(document, 'pointerup', 2, 100);
        const stillDragging = slider.root.classList.contains('tvist-v1--dragging');
        send(document, 'pointerup', 1, 460);
        return { beforeForeign, afterForeign, stillDragging };
      });
      expect(result.afterForeign, 'IN02_FOREIGN_POINTER_MOVED_SLIDER').toBeCloseTo(
        result.beforeForeign,
        1
      );
      expect(result.stillDragging, 'IN02_FOREIGN_POINTER_FINISHED_DRAG').toBe(true);
      break;
    }
    case 'IN03': {
      await mount(page, { speed: 0, visibility: false });
      const before = await position(page);
      await drag(page, '#audit-slider .tvist-v1__track', 5, 150);
      expect(await position(page), 'IN03_PERPENDICULAR_MOVEMENT').toBeCloseTo(before, 1);
      expect(await mainIndex(page)).toBe(0);
      await expect(page.locator('#audit-slider')).not.toHaveClass(/tvist-v1--dragging/);
      await drag(page, '#audit-slider .tvist-v1__track', -420);
      expect(await mainIndex(page), 'IN03_NEXT_GESTURE_WORKS').toBeGreaterThan(0);
      break;
    }
    case 'IN04': {
      await mount(page, { speed: 0, visibility: false });
      const rect = (await page.locator('#audit-slider .tvist-v1__track').boundingBox())!;
      await page.mouse.move(rect.x + 500, rect.y + 80);
      await page.mouse.down();
      await page.mouse.move(rect.x + 250, rect.y + 80, { steps: 8 });
      await page.evaluate(() => (window as unknown as AuditWindow).auditSlider.disable());
      await page.mouse.move(rect.x + 120, rect.y + 80);
      await page.mouse.up();
      await expect(page.locator('#audit-slider')).not.toHaveClass(/tvist-v1--dragging/);
      const disabled = await page.evaluate(() => ({
        enabled: (window as unknown as AuditWindow).auditSlider.isEnabled,
        transform: (window as unknown as AuditWindow).auditSlider.container.style.transform,
      }));
      expect(disabled, 'IN04_DISABLED_DRAG_WRITES').toEqual({ enabled: false, transform: '' });
      await page.evaluate(() => (window as unknown as AuditWindow).auditSlider.enable());
      await settle(page);
      const before = await mainIndex(page);
      await drag(page, '#audit-slider .tvist-v1__track', -420);
      expect(await mainIndex(page), 'IN04_DRAG_AFTER_ENABLE').toBeGreaterThan(before);
      await check(page);
      break;
    }
    case 'IN05': {
      await mount(page, {
        speed: 0,
        visibility: false,
        holdToPause: { threshold: 50 },
        autoplay: {
          delay: 10000,
          pauseOnHover: false,
          pauseOnFocus: false,
          pauseOnInteraction: false,
        },
      });
      const rect = (await page.locator('#audit-slider .tvist-v1__track').boundingBox())!;
      await page.mouse.move(rect.x + 300, rect.y + 100);
      await page.mouse.down();
      await expect
        .poll(
          () =>
            page.evaluate(() =>
              (window as unknown as AuditWindow).auditSlider.autoplay!.isPaused()
            ),
          { message: 'IN05_HOLD_PAUSES', timeout: 1500 }
        )
        .toBe(true);
      await page.evaluate(() =>
        document.dispatchEvent(
          new PointerEvent('pointercancel', {
            bubbles: true,
            pointerId: 1,
            pointerType: 'mouse',
            button: 0,
          })
        )
      );
      await page.mouse.up();
      await expect
        .poll(
          () =>
            page.evaluate(() =>
              (window as unknown as AuditWindow).auditSlider.autoplay!.isPaused()
            ),
          { message: 'IN05_CANCEL_RESUMES', timeout: 1500 }
        )
        .toBe(false);
      expect(await mainIndex(page)).toBe(0);
      break;
    }
    case 'IN06': {
      await mount(
        page,
        { speed: 0, visibility: false, preventClicks: true, preventClicksPropagation: true },
        {
          contents: Array.from(
            { length: 7 },
            () =>
              '<a href="#audit-destination" style="display:block;width:100%;height:250px">Open destination</a>'
          ),
        }
      );
      const anchor = page.locator('#audit-slider a').first();
      const rect = (await anchor.boundingBox())!;
      await page.mouse.move(rect.x + 300, rect.y + 100);
      await page.mouse.down();
      await page.mouse.move(rect.x + 250, rect.y + 100, { steps: 8 });
      await page.mouse.up();
      await settle(page);
      expect(new URL(page.url()).hash, 'IN06_DRAG_TRIGGERED_LINK').not.toBe('#audit-destination');
      // The short flick may legitimately select a different card in each engine.
      // Click the actually selected, clipped-in-view link rather than the old first card.
      const target = await page.evaluate(() => {
        const s = (window as unknown as AuditWindow).auditSlider;
        const slide = s.slides[s.activeIndex]!;
        const link = slide.querySelector('a')!;
        const rect = link.getBoundingClientRect();
        const track = s.track.getBoundingClientRect();
        return {
          index: s.realIndex,
          cardId: slide.dataset.caseId,
          visibleWidth: Math.max(
            0,
            Math.min(rect.right, track.right) - Math.max(rect.left, track.left)
          ),
          visibleHeight: Math.max(
            0,
            Math.min(rect.bottom, track.bottom) - Math.max(rect.top, track.top)
          ),
        };
      });
      expect(target.visibleWidth, 'IN06_NEXT_CLICK_TARGET_IN_TRACK').toBeGreaterThan(0);
      expect(target.visibleHeight, 'IN06_NEXT_CLICK_TARGET_IN_TRACK').toBeGreaterThan(0);
      await page.locator(`#audit-slider [data-case-id="${target.cardId}"] a`).click();
      await expect
        .poll(() => new URL(page.url()).hash, { message: 'IN06_NEXT_REAL_CLICK_LOST' })
        .toBe('#audit-destination');
      expect(await mainIndex(page), 'IN06_ORDINARY_LINK_CLICK_MUST_NOT_NAVIGATE_SLIDER').toBe(
        target.index
      );
      break;
    }
    case 'IN07': {
      await mount(
        page,
        {
          speed: 0,
          visibility: false,
          focusableElements: 'input,textarea,select,button,a,[contenteditable],[tabindex]',
        },
        {
          contents: [
            '<label>Text <input aria-label="Audit input" value="start"></label><button type="button"><span>Nested button</span></button>',
            ...Array.from({ length: 6 }, () => 'Other'),
          ],
        }
      );
      await page.getByRole('textbox', { name: 'Audit input' }).fill('edited');
      const rect = (await page.getByRole('button', { name: 'Nested button' }).boundingBox())!;
      await page.mouse.move(rect.x + 10, rect.y + 10);
      await page.mouse.down();
      await page.mouse.move(rect.x + 110, rect.y + 10, { steps: 5 });
      await page.mouse.up();
      await settle(page);
      expect(await mainIndex(page), 'IN07_EXCLUDED_CONTROL_STARTED_DRAG').toBe(0);
      await expect(page.getByRole('textbox', { name: 'Audit input' })).toHaveValue('edited');
      await expect(page.locator('#audit-slider')).not.toHaveClass(/tvist-v1--dragging/);
      break;
    }
    case 'IN08': {
      await mount(page, { speed: 0, visibility: false, loop: { withClones: true } });
      const result = await page.evaluate(() => {
        const slider = (window as unknown as AuditWindow).auditSlider;
        const clicks: Array<{
          received: number;
          logical: number;
          domIndex: number;
          requested: number;
          targetIdentity: boolean;
          cardId?: string;
          isClone: boolean;
          event: { type: string; bubbles: boolean; trusted: boolean; targetTag?: string };
        }> = [];
        let expectedTarget: HTMLElement | undefined;
        let requested = -1;
        slider.on('click', (index: number, slide: HTMLElement, event: MouseEvent) => {
          clicks.push({
            received: index,
            logical: Number(slide.dataset.tvistSlideIndex),
            domIndex: slider.slides.indexOf(slide),
            requested,
            targetIdentity: slide === expectedTarget && event.target === expectedTarget,
            cardId: slide.dataset.caseId,
            isClone: slide.classList.contains('tvist-v1__slide--clone'),
            event: {
              type: event.type,
              bubbles: event.bubbles,
              trusted: event.isTrusted,
              targetTag: (event.target as Element | null)?.tagName,
            },
          });
        });
        for (const target of [0, 4, 6, 1]) {
          slider.scrollTo(target, true);
          requested = target;
          expectedTarget = slider.slides[slider.activeIndex]!;
          expectedTarget.click();
        }
        return clicks;
      });
      expect(result).toHaveLength(4);
      expect(
        result.every((click) => click.targetIdentity),
        'IN08_CLICK_PAYLOAD_TARGET_IDENTITY'
      ).toBe(true);
      if (result.some((click) => click.received !== click.logical)) {
        throw new Error(
          `CONTRACT_GAP: click(index, slide, event) does not specify DOM versus logical index. Observed DOM index differs from original identity; this is not an asserted logical-index guarantee. ${JSON.stringify(result)}`
        );
      }
      break;
    }
    case 'CT01': {
      await mount(page, { speed: 0, visibility: false, wheel: { releaseOnEdges: true } });
      const prevented = await page.evaluate(() => {
        const slider = (window as unknown as AuditWindow).auditSlider;
        const results: boolean[] = [];
        for (const end of [false, true]) {
          slider.scrollTo(end ? 6 : 0, true);
          for (let i = 0; i < 5; i++) {
            const event = new WheelEvent('wheel', {
              bubbles: true,
              cancelable: true,
              deltaY: end ? 100 : -100,
            });
            slider.root.dispatchEvent(event);
            results.push(event.defaultPrevented);
          }
        }
        return results;
      });
      expect(prevented, 'CT01_THROTTLE_SWALLOWS_EDGE_SCROLL').toEqual(Array(10).fill(false));
      break;
    }
    case 'CT02': {
      await mount(page, { speed: 0, visibility: false, wheel: { releaseOnEdges: true } });
      await page.evaluate(() => {
        document.body.style.minHeight = '3000px';
        (window as unknown as AuditWindow).auditSlider.scrollTo(6, true);
      });
      const rect = (await page.locator('#audit-slider').boundingBox())!;
      await page.mouse.move(rect.x + 300, rect.y + 100);
      await page.mouse.wheel(0, 300);
      await expect
        .poll(() => page.evaluate(() => window.scrollY), {
          message: 'CT02_NATIVE_PAGE_SCROLL_RELEASE',
        })
        .toBeGreaterThan(0);
      expect(await mainIndex(page)).toBe(6);
      break;
    }
    case 'CT03': {
      await mount(page, { speed: 0, visibility: false, scrollbar: true });
      const thumb = page.locator('#audit-slider .tvist-v1__scrollbar-thumb');
      const rect = (await thumb.boundingBox())!;
      await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
      await page.mouse.down();
      await page.mouse.move(rect.x + rect.width / 2 + 120, rect.y + rect.height / 2, { steps: 5 });
      await page.evaluate(() =>
        document.dispatchEvent(
          new PointerEvent('pointercancel', {
            bubbles: true,
            pointerId: 1,
            pointerType: 'mouse',
            button: 0,
          })
        )
      );
      const before = await position(page);
      await page.mouse.move(rect.x + rect.width / 2 + 240, rect.y + rect.height / 2);
      const after = await position(page);
      const dragging = await page
        .locator('#audit-slider .tvist-v1__scrollbar')
        .getAttribute('class');
      await page.mouse.up();
      expect(dragging, 'CT03_CANCEL_STUCK_SCROLLBAR').not.toContain(
        'tvist-v1__scrollbar--dragging'
      );
      expect(after, 'CT03_CANCEL_STALE_SCROLLBAR_MOVE').toBeCloseTo(before, 1);
      break;
    }
    case 'CT04': {
      await mount(page, {
        speed: 0,
        visibility: false,
        drag: false,
        scrollbar: { draggable: false },
      });
      await page.evaluate(() =>
        (window as unknown as AuditWindow).auditSlider.updateOptions({
          scrollbar: { draggable: true },
        })
      );
      await drag(page, '#audit-slider .tvist-v1__scrollbar-thumb', 200);
      expect(await mainIndex(page), 'CT04_ENABLE_SCROLLBAR_DRAG').toBeGreaterThan(0);
      await page.evaluate(() =>
        (window as unknown as AuditWindow).auditSlider.updateOptions({
          scrollbar: { draggable: false },
        })
      );
      const before = await position(page);
      await drag(page, '#audit-slider .tvist-v1__scrollbar-thumb', -100);
      expect(await position(page), 'CT04_DISABLE_SCROLLBAR_DRAG').toBeCloseTo(before, 1);
      break;
    }
    case 'CT05': {
      await mount(page, { speed: 0, visibility: false });
      await page.evaluate(() => {
        const w = window as unknown as AuditWindow;
        for (const id of ['audit-scroll-a', 'audit-scroll-b']) {
          const container = document.createElement('div');
          container.id = id;
          container.style.cssText = 'position:relative;width:720px;height:20px';
          document.body.append(container);
        }
        w.auditSlider.updateOptions({ scrollbar: { container: '#audit-scroll-a' } });
        w.auditSlider.updateOptions({ scrollbar: { container: '#audit-scroll-b' } });
      });
      await expect(
        page.locator('#audit-scroll-b .tvist-v1__scrollbar-thumb'),
        'CT05_NEW_SCROLLBAR_CONTAINER'
      ).toHaveCount(1);
      await expect(
        page.locator('#audit-scroll-a .tvist-v1__scrollbar-thumb'),
        'CT05_OLD_SCROLLBAR_CONTAINER'
      ).toHaveCount(0);
      break;
    }
    case 'SY01': {
      await pair(page, { optionOnly: true });
      await page.locator('#audit-thumbs [data-case-id="2"]').click();
      await settle(page);
      expect(await mainIndex(page), 'SY01_THUMBS_OPTION_CLICK_SYNC').toBe(2);
      await page.evaluate(() => (window as unknown as AuditWindow).auditSlider.scrollTo(4, true));
      await settle(page);
      expect(await thumbIndex(page), 'SY01_THUMBS_OPTION_REVERSE_SYNC').toBe(4);
      break;
    }
    case 'SY02': {
      await pair(page, { loop: true });
      const result = await page.evaluate(() => {
        const w = window as unknown as AuditWindow;
        const thumbs = w.auditThumbs!;
        const results: Array<{ requested: number; main: number }> = [];
        for (let i = 0; i < 15; i++) thumbs.next();
        for (const requested of [0, 4, 2, 6]) {
          thumbs.scrollTo(requested, true);
          const slide = thumbs.slides[thumbs.activeIndex]!;
          const logical = Number(slide.dataset.caseId);
          slide.click();
          results.push({ requested: logical, main: w.auditSlider.realIndex });
        }
        return results;
      });
      for (const item of result)
        expect(item.main, 'SY02_REORDERED_THUMB_IDENTITY').toBe(item.requested);
      break;
    }
    case 'SY03': {
      await pair(page);
      await page.evaluate(() => {
        const w = window as unknown as AuditWindow;
        w.auditThumbs!.disable();
        w.auditSlider.scrollTo(4, true);
        w.auditThumbs!.enable();
      });
      await settle(page);
      await page.evaluate(() => {
        const w = window as unknown as AuditWindow;
        w.auditThumbs!.scrollTo(1, true);
        w.auditThumbs!.slides[w.auditThumbs!.activeIndex]!.click();
      });
      await settle(page);
      expect(await mainIndex(page), 'SY03_SYNC_AFTER_REENABLE').toBe(1);
      expect(await thumbIndex(page)).toBe(1);
      break;
    }
    case 'SY04': {
      await pair(page, { syncOnDrag: false });
      await drag(page, '#audit-thumbs .tvist-v1__track', -420);
      expect(await mainIndex(page), 'SY04_DRAG_MUST_NOT_SYNC').toBe(0);
      const target = await thumbIndex(page);
      expect(target, 'SY04_DRAG_ACTUALLY_MOVED_THUMBS').toBeGreaterThan(0);
      await page.locator(`#audit-thumbs [data-case-id="${target}"]`).click();
      await settle(page);
      expect(await mainIndex(page), 'SY04_CLICK_AFTER_UNSYNCED_DRAG').toBe(target);
      break;
    }
    case 'SY05': {
      await mount(page, { speed: 0, visibility: false });
      await page.evaluate(() => {
        const w = window as unknown as AuditWindow;
        const make = (id: string, width: number, height: number): HTMLElement => {
          const root = document.createElement('div');
          root.id = id;
          root.className = 'tvist-v1';
          root.style.cssText = `width:${width}px;height:${height}px`;
          root.innerHTML = `<div class="tvist-v1__track" style="height:${height}px"><div class="tvist-v1__container">${Array.from({ length: 4 }, (_, i) => `<div class="tvist-v1__slide" style="height:${height}px">${i}</div>`).join('')}</div></div>`;
          return root;
        };
        const middle = make('audit-middle', 600, 280);
        const child = make('audit-child', 480, 180);
        w.auditSlider.slides[0]!.replaceChildren(middle);
        middle.querySelector('.tvist-v1__slide')!.replaceChildren(child);
        // Deepest-first initialization exercises the opposite order to the existing integration suite.
        w.auditChild = new w.TvistV1(child, { speed: 0, visibility: false });
        w.auditMiddle = new w.TvistV1(middle, { speed: 0, visibility: false });
      });
      await settle(page);
      await drag(page, '#audit-child > .tvist-v1__track', -300);
      const result = await page.evaluate(() => {
        const w = window as unknown as AuditWindow;
        return {
          outer: w.auditSlider.realIndex,
          middle: w.auditMiddle!.realIndex,
          child: w.auditChild!.realIndex,
        };
      });
      expect(result.outer, 'SY05_OUTER_GESTURE_ISOLATION').toBe(0);
      expect(result.middle, 'SY05_MIDDLE_GESTURE_ISOLATION').toBe(0);
      expect(result.child).toBeGreaterThan(0);
      await page.evaluate(() => (window as unknown as AuditWindow).auditSlider.destroy());
      await drag(page, '#audit-child > .tvist-v1__track', -300);
      expect(
        await page.evaluate(() => (window as unknown as AuditWindow).auditChild!.realIndex),
        'SY05_CHILD_SURVIVES_PARENT_DESTROY'
      ).toBeGreaterThan(result.child);
      break;
    }
    case 'LC01': {
      await mount(page, { speed: 0, visibility: false, pagination: true }, { count: 3 });
      const result = await page.evaluate(() => {
        const slider = (window as unknown as AuditWindow).auditSlider;
        const slide = document.createElement('div');
        slide.className = 'tvist-v1__slide';
        slide.style.height = '360px';
        slide.textContent = 'Appended';
        slider.container.append(slide);
        slider.update();
        slider.scrollTo(3, true);
        return {
          count: slider.slideCount,
          includes: slider.slides.includes(slide),
          active: slider.realIndex,
          connected: slider.slides[slider.activeIndex]?.textContent,
        };
      });
      expect(result, 'LC01_APPEND_UPDATE_CONTRACT').toEqual({
        count: 4,
        includes: true,
        active: 3,
        connected: 'Appended',
      });
      await expect(page.locator('#audit-slider .tvist-v1__bullet')).toHaveCount(4);
      break;
    }
    case 'LC02': {
      await mount(page, { speed: 0, visibility: false }, { count: 4 });
      const result = await page.evaluate(() => {
        const slider = (window as unknown as AuditWindow).auditSlider;
        slider.scrollTo(2, true);
        slider.slides[slider.activeIndex]!.remove();
        slider.update();
        return {
          count: slider.slideCount,
          allConnected: slider.slides.every((slide) => slide.isConnected),
          activeConnected: slider.slides[slider.activeIndex]?.isConnected ?? false,
        };
      });
      expect(result, 'LC02_REMOVED_ACTIVE_STALE_COLLECTION').toEqual({
        count: 3,
        allConnected: true,
        activeConnected: true,
      });
      await check(page);
      break;
    }
    case 'LC03': {
      await mount(page, { speed: 0, visibility: false, pagination: true }, { count: 5 });
      const result = await page.evaluate(() => {
        const slider = (window as unknown as AuditWindow).auditSlider;
        slider.slides[1]!.style.display = 'none';
        slider.slides[3]!.style.display = 'none';
        slider.update();
        return {
          count: slider.slideCount,
          allDisplayed: slider.slides.every((slide) => getComputedStyle(slide).display !== 'none'),
        };
      });
      expect(result, 'LC03_FILTER_UPDATE_STALE_COLLECTION').toEqual({
        count: 3,
        allDisplayed: true,
      });
      await expect(page.locator('#audit-slider .tvist-v1__bullet')).toHaveCount(3);
      break;
    }
    case 'LC04': {
      await mount(page, { speed: 300, visibility: false });
      const rect = (await page.locator('#audit-slider .tvist-v1__track').boundingBox())!;
      await page.mouse.move(rect.x + 500, rect.y + 80);
      await page.mouse.down();
      await page.mouse.move(rect.x + 250, rect.y + 80, { steps: 8 });
      await page.evaluate(() => {
        const w = window as unknown as AuditWindow;
        w.auditSlider = new w.TvistV1(w.auditSlider.root, { speed: 0, visibility: false });
      });
      await settle(page);
      const before = await position(page);
      await page.mouse.move(rect.x + 100, rect.y + 80);
      await page.mouse.up();
      await settle(page);
      expect(await position(page), 'LC04_OLD_GESTURE_MOVED_REPLACEMENT').toBeCloseTo(before, 1);
      expect(await mainIndex(page)).toBe(0);
      await drag(page, '#audit-slider .tvist-v1__track', -420);
      expect(await mainIndex(page)).toBeGreaterThan(0);
      await check(page);
      break;
    }
    case 'LC05': {
      await mount(page, { speed: 0, visibility: false });
      const result = await page.evaluate(() => {
        const slider = (window as unknown as AuditWindow).auditSlider;
        let changes = 0;
        slider.on('slideChangeStart', () => {
          changes++;
        });
        for (let i = 0; i < 20; i++) {
          slider.updateOptions({ arrows: true, pagination: true, wheel: true, scrollbar: true });
          slider.updateOptions({
            arrows: false,
            pagination: false,
            wheel: false,
            scrollbar: false,
          });
        }
        slider.updateOptions({ arrows: true, pagination: true, wheel: true, scrollbar: true });
        const query = (suffix: string) =>
          slider.root.querySelectorAll(`.tvist-v1__${suffix}`).length;
        const controls = {
          prev: query('arrow--prev'),
          next: query('arrow--next'),
          pagination: query('pagination'),
          scrollbar: query('scrollbar'),
        };
        slider.root.querySelector<HTMLButtonElement>('.tvist-v1__arrow--next')!.click();
        return { controls, changes, index: slider.realIndex };
      });
      expect(result, 'LC05_CONTROL_REACTIVATION_DUPLICATES').toEqual({
        controls: { prev: 1, next: 1, pagination: 1, scrollbar: 1 },
        changes: 1,
        index: 1,
      });
      break;
    }
    case 'EV01': {
      await mount(page, { speed: 0, visibility: false });
      const calls = await page.evaluate(() => {
        const slider = (window as unknown as AuditWindow).auditSlider;
        let calls = 0;
        slider.once('audit:reentrant', () => {
          calls++;
          // Bound the repro: a defect must produce an assertion failure, never an infinite recursion.
          if (calls < 3) slider.emit('audit:reentrant');
        });
        slider.emit('audit:reentrant');
        slider.emit('audit:reentrant');
        return calls;
      });
      expect(calls, 'EV01_ONCE_REENTRANT_CALLBACK_COUNT').toBe(1);
      break;
    }
    case 'EV02': {
      await mount(page, { speed: 150, visibility: false });
      await page.evaluate(() => {
        const w = window as unknown as AuditWindow;
        w.auditCounts = { start: 0, end: 0 };
        w.auditSlider.on('slideChangeEnd', () => {
          w.auditCounts!.end++;
        });
        w.auditSlider.on('slideChangeStart', () => {
          w.auditCounts!.start++;
          if (w.auditCounts!.start === 1) w.auditSlider.destroy();
        });
        w.auditSlider.next();
      });
      // Observe beyond the requested transition duration; this is a post-destroy callback check.
      await page.waitForTimeout(250);
      const result = await page.evaluate(() => {
        const w = window as unknown as AuditWindow;
        return {
          counts: w.auditCounts,
          transition: w.auditSlider.container.style.transition,
          instance:
            (w.auditSlider.root as HTMLElement & { tvistInstance?: Tvist | null }).tvistInstance ===
            null,
        };
      });
      expect(result, 'EV02_DESTROY_REENTRANT_LATE_TRANSITION').toEqual({
        counts: { start: 1, end: 0 },
        transition: '',
        instance: true,
      });
      break;
    }
    case 'EV03': {
      await mount(page, { speed: 0, visibility: false });
      const result = await page.evaluate(() => {
        const slider = (window as unknown as AuditWindow).auditSlider;
        let oldCount = 0;
        let freshCount = 0;
        const fresh = () => {
          freshCount++;
        };
        slider.updateOptions({
          on: {
            slideChangeStart: () => {
              oldCount++;
            },
          },
        });
        slider.next();
        for (let i = 0; i < 20; i++) slider.updateOptions({ on: { slideChangeStart: fresh } });
        slider.next();
        slider.updateOptions({ on: {} });
        slider.next();
        return { oldCount, freshCount, index: slider.realIndex };
      });
      expect(result, 'EV03_EVENT_HANDLER_REPLACEMENT').toEqual({
        oldCount: 1,
        freshCount: 1,
        index: 3,
      });
      break;
    }
    default:
      throw new Error(`Unknown input audit case: ${id}`);
  }
}
