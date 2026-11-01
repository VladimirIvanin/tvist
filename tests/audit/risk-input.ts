import { expect, type Page, type Route } from '@playwright/test';
import type { Tvist } from '../../src/core/Tvist';
import type { TvistOptions } from '../../src/core/types';
import { check, mount, settle, type AuditWindow } from './browser-fixture';
import type { AuditCase } from './types';

type Factor = string | number | boolean;
interface RiskManifest {
  family: string;
  domains: Record<string, readonly Factor[]>;
  tuples: Array<{ id: string; factors: Record<string, Factor> }>;
}
const specifications: Array<Omit<RiskManifest, 'tuples'>> = [
  {
    family: 'R03',
    domains: {
      clones: ['explicit', 'automatic'],
      content: ['video', 'lazy'],
      lifecycle: ['disable-enable', 'destroy-reinit'],
    },
  },
  {
    family: 'R04',
    domains: {
      drag: ['off', 'snap', 'free'],
      loop: ['off', 'ordinary', 'clones'],
      cancel: ['pointercancel', 'lostcapture', 'touchcancel'],
    },
  },
  {
    family: 'R05',
    domains: {
      base: ['window', 'container'],
      enabled: [true, false],
      modules: ['controls', 'autoplay', 'lazy'],
    },
  },
  {
    family: 'R09',
    domains: {
      nested: ['2levels', '3levels'],
      init: ['parentfirst', 'childfirst'],
      axes: ['same', 'mixed'],
    },
  },
  {
    family: 'R10',
    domains: {
      freeSnap: [false, true],
      pagination: ['bullets', 'fraction', 'progress'],
      scrollbar: [false, true],
    },
  },
];
export const riskInputManifest: RiskManifest[] = specifications.map((specification) => {
  let factors: Array<Record<string, Factor>> = [{}];
  for (const [key, levels] of Object.entries(specification.domains))
    factors = factors.flatMap((value) => levels.map((level) => ({ ...value, [key]: level })));
  return {
    ...specification,
    tuples: factors.map((value, index) => ({
      id: `RISK-${specification.family.slice(1)}-${String(index).padStart(3, '0')}`,
      factors: value,
    })),
  };
});
const sources: Record<string, string[]> = {
  R03: [
    'https://github.com/nolimits4web/swiper/issues/8036',
    'https://github.com/nolimits4web/swiper/issues/6684',
    'https://github.com/nolimits4web/swiper/issues/7664',
  ],
  R04: ['https://github.com/Splidejs/splide/issues/1365'],
  R05: [
    'https://github.com/nolimits4web/swiper/issues/6263',
    'https://github.com/Splidejs/splide/issues/1268',
  ],
  R09: ['https://github.com/nolimits4web/swiper/issues/7702'],
  R10: [
    'https://github.com/Splidejs/splide/issues/810',
    'https://github.com/Splidejs/splide/issues/851',
    'https://github.com/nolimits4web/swiper/issues/7981',
  ],
};
export const riskInputCases: Array<AuditCase & { factors: Record<string, Factor> }> =
  riskInputManifest.flatMap((family) =>
    family.tuples.map((tuple) => ({
      ...tuple,
      family: family.family,
      priority: 'P0',
      sources:
        family.family === 'R03'
          ? sources.R03!.filter(
              (url) => !url.endsWith(tuple.factors.content === 'video' ? '/6684' : '/7664')
            )
          : sources[family.family]!,
      title: `${family.family} ${Object.entries(tuple.factors)
        .map(([key, value]) => `${key}=${value}`)
        .join(
          ' × '
        )}${family.family === 'R04' ? ' (synthetic cancellation; real capture for lostcapture)' : family.family === 'R03' ? ' (synthetic video readiness; native image load)' : ''}`,
    }))
  );
interface RiskWindow extends AuditWindow {
  riskCounts: {
    start: number;
    end: number;
    changes: number;
    video: number;
    lazy: number;
    lost: number;
  };
  riskPointer?: typeof PointerEvent;
  riskOwner?: { pointerId: number; captured: boolean };
  riskNodes?: HTMLElement[];
  riskNested?: Tvist[];
  riskLateImageLoads?: number;
  riskEvidence?: Array<Record<string, unknown>>;
}
const GIF = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const GIF_URL = `data:image/gif;base64,${GIF}`;
async function phase(
  page: Page,
  name: string,
  observations: Record<string, unknown> = {}
): Promise<void> {
  await page.evaluate(
    ({ name, observations }) => {
      const w = window as unknown as RiskWindow;
      (w.riskEvidence ??= []).push({ phase: name, ...observations });
    },
    { name, observations }
  );
}
async function counters(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as RiskWindow;
    w.riskCounts = { start: 0, end: 0, changes: 0, video: 0, lazy: 0, lost: 0 };
    w.auditSlider.on('dragStart', () => w.riskCounts.start++);
    w.auditSlider.on('dragEnd', () => w.riskCounts.end++);
    w.auditSlider.on('slideChangeStart', () => w.riskCounts.changes++);
    w.auditSlider.on('videoReady', () => w.riskCounts.video++);
    w.auditSlider.on('lazyLoaded', () => w.riskCounts.lazy++);
  });
}
async function positiveSize(
  page: Page,
  selector = '#audit-slider > .tvist-v1__track'
): Promise<void> {
  const box = await page.locator(selector).boundingBox();
  expect(box, 'RISK_FIXTURE_MISSING_BOX').not.toBeNull();
  expect(box!.width, 'RISK_FIXTURE_POSITIVE_WIDTH').toBeGreaterThan(40);
  expect(box!.height, 'RISK_FIXTURE_POSITIVE_HEIGHT').toBeGreaterThan(40);
}
async function authorHeights(page: Page): Promise<void> {
  await page.evaluate(() => {
    const style = document.createElement('style');
    style.textContent =
      '#audit-slider > .tvist-v1__track > .tvist-v1__container > .tvist-v1__slide { height: 300px; }';
    document.head.append(style);
  });
}
async function rawDrag(
  page: Page,
  selector: string,
  vertical: boolean,
  distance: number
): Promise<void> {
  await positiveSize(page, selector);
  const rect = (await page.locator(selector).boundingBox())!;
  const x = rect.x + rect.width * (vertical ? 0.6 : 0.82);
  const y = rect.y + rect.height * (vertical ? 0.82 : 0.65);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - (vertical ? 0 : distance), y - (vertical ? distance : 0), {
    steps: 12,
  });
  // Hold still before release so this is a slow drag, not a timing-dependent flick.
  await page.waitForTimeout(300);
  await page.mouse.up();
  await settle(page);
}
async function inertDestroyed(page: Page): Promise<void> {
  const before = await page.evaluate(() => {
    const w = window as unknown as RiskWindow;
    w.auditSlider.destroy();
    return { html: w.auditSlider.root.outerHTML, counts: { ...w.riskCounts } };
  });
  await page.evaluate(() => {
    const w = window as unknown as RiskWindow;
    const root = w.auditSlider.root;
    root.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, button: 0, clientX: 300, clientY: 80 })
    );
    document.dispatchEvent(
      new MouseEvent('mousemove', { bubbles: true, clientX: 40, clientY: 80 })
    );
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    if ('PointerEvent' in window) {
      root.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          pointerId: 55,
          button: 0,
          clientX: 300,
          clientY: 80,
        })
      );
      document.dispatchEvent(
        new PointerEvent('pointermove', { bubbles: true, pointerId: 55, clientX: 40, clientY: 80 })
      );
      document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 55 }));
    } else {
      for (const [name, x] of [
        ['touchstart', 300],
        ['touchmove', 40],
        ['touchend', 40],
      ] as const) {
        const event = new Event(name, { bubbles: true, cancelable: true });
        const point = { identifier: 55, clientX: x, clientY: 80 };
        Object.defineProperties(event, {
          touches: { value: name === 'touchend' ? [] : [point] },
          changedTouches: { value: [point] },
        });
        (name === 'touchstart' ? root : document).dispatchEvent(event);
      }
    }
  });
  await page.waitForTimeout(100);
  const after = await page.evaluate(() => {
    const w = window as unknown as RiskWindow;
    return { html: w.auditSlider.root.outerHTML, counts: { ...w.riskCounts } };
  });
  expect(after, 'RISK_ACTIVITY_AFTER_DESTROY').toEqual(before);
}

async function cloneMedia(page: Page, factors: Record<string, Factor>): Promise<void> {
  const count = factors.clones === 'automatic' ? 3 : 7;
  const options: TvistOptions = {
    perPage: 2,
    loop: factors.clones === 'automatic' ? true : { withClones: true },
    video: factors.content === 'video' ? { autoplay: false, muted: true } : false,
    lazy: factors.content === 'lazy' ? { preloadPrevNext: 0 } : false,
  };
  const pending: Route[] = [];
  const route = (request: Route) => {
    pending.push(request);
  };
  if (factors.content === 'lazy') await page.route('**/risk-media-*.gif', route);
  try {
    await mount(page, options, {
      count,
      height: 300,
      contents: Array.from({ length: count }, (_, i) =>
        factors.content === 'video'
          ? `<video muted playsinline preload="none" data-risk-video="${i}"></video>`
          : `<img alt="Risk ${i}" data-src="/risk-media-${i}.gif" width="40" height="40">`
      ),
    });
    await authorHeights(page);
    await positiveSize(page);
    await counters(page);
    const clones = await page.locator('#audit-slider .tvist-v1__slide--clone').count();
    expect(clones, 'R03_FIXTURE_REALLY_USES_CLONES').toBeGreaterThan(0);
    await phase(page, 'clones-present', { clones });
    if (factors.content === 'video') {
      const ready = await page.evaluate(() => {
        const w = window as unknown as RiskWindow;
        const nodes = [...w.auditSlider.root.querySelectorAll<HTMLVideoElement>('video')];
        w.riskNodes = nodes;
        const deltas = nodes.map((node) => {
          const n = w.riskCounts.video;
          node.dispatchEvent(new Event('loadedmetadata'));
          return w.riskCounts.video - n;
        });
        return { count: nodes.length, deltas };
      });
      expect(ready.count, 'R03_VIDEO_FIXTURE_INCLUDES_CLONED_MEDIA').toBeGreaterThan(count);
      expect(ready.deltas, 'R03_EACH_ORIGINAL_AND_CLONED_VIDEO_LISTENS_ONCE').toEqual(
        Array(ready.count).fill(1)
      );
    } else {
      await expect
        .poll(() => pending.length, { message: 'R03_NATIVE_IMAGE_REQUEST_STARTED' })
        .toBeGreaterThan(0);
      await page.evaluate(() => {
        const w = window as unknown as RiskWindow;
        w.riskNodes = [...w.auditSlider.root.querySelectorAll<HTMLElement>('img')];
        w.riskLateImageLoads = 0;
        for (const image of w.riskNodes)
          image.addEventListener(
            'load',
            () => {
              w.riskLateImageLoads = (w.riskLateImageLoads ?? 0) + 1;
            },
            { once: true }
          );
      });
    }
    await phase(page, 'lifecycle-start');
    const stopped = await page.evaluate((lifecycle) => {
      const w = window as unknown as RiskWindow;
      if (lifecycle === 'disable-enable') w.auditSlider.disable();
      else w.auditSlider.destroy();
      return {
        html: w.auditSlider.root.outerHTML,
        counts: { ...w.riskCounts },
        enabled: w.auditSlider.isEnabled,
      };
    }, String(factors.lifecycle));
    if (factors.lifecycle === 'disable-enable') expect(stopped.enabled).toBe(false);
    if (factors.content === 'video')
      await page.evaluate(() => {
        for (const node of (window as unknown as RiskWindow).riskNodes!)
          node.dispatchEvent(new Event('loadedmetadata'));
      });
    else {
      for (const request of pending.splice(0))
        await request.fulfill({
          status: 200,
          contentType: 'image/gif',
          body: Buffer.from(GIF, 'base64'),
        });
      await expect
        .poll(() => page.evaluate(() => (window as unknown as RiskWindow).riskLateImageLoads), {
          message: 'R03_FIXTURE_NATIVE_LOAD_REACHED_RETAINED_IMAGE_AFTER_TEARDOWN',
        })
        .toBeGreaterThan(0);
    }
    const afterLate = await page.evaluate(() => {
      const w = window as unknown as RiskWindow;
      return { html: w.auditSlider.root.outerHTML, counts: { ...w.riskCounts } };
    });
    expect(afterLate, 'R03_DISABLED_OR_DESTROYED_MEDIA_MUST_NOT_MUTATE_DOM_OR_EMIT').toEqual({
      html: stopped.html,
      counts: stopped.counts,
    });
    await phase(page, 'late-media-inert');
    await page.evaluate(
      ({ lifecycle, serialized }) => {
        const w = window as unknown as RiskWindow;
        const options = JSON.parse(serialized) as TvistOptions;
        if (lifecycle === 'disable-enable') w.auditSlider.enable();
        else
          w.auditSlider = new w.TvistV1(w.auditSlider.root, {
            ...options,
            speed: 0,
            visibility: false,
          });
        w.auditOriginals = [
          ...w.auditSlider.root.querySelectorAll<HTMLElement>(
            '.tvist-v1__slide:not(.tvist-v1__slide--clone)'
          ),
        ];
      },
      { lifecycle: factors.lifecycle, serialized: JSON.stringify(options) }
    );
    await settle(page);
    // Existing public subscriptions survive disable/enable. Register a new set only for a new instance.
    if (factors.lifecycle === 'destroy-reinit') await counters(page);
    await positiveSize(page);
    expect(
      await page.locator('#audit-slider .tvist-v1__slide--clone').count(),
      'R03_CLONES_RECREATED'
    ).toBeGreaterThan(0);
    if (factors.content === 'video') {
      const deltas = await page.evaluate(() => {
        const w = window as unknown as RiskWindow;
        return [...w.auditSlider.root.querySelectorAll('video')].map((node) => {
          const before = w.riskCounts.video;
          node.dispatchEvent(new Event('loadedmetadata'));
          return w.riskCounts.video - before;
        });
      });
      expect(
        deltas.every((value) => value === 1),
        'R03_REENABLED_VIDEO_NO_DUPLICATE_LISTENERS'
      ).toBe(true);
    } else {
      await expect
        .poll(
          () =>
            page
              .locator('#audit-slider img')
              .evaluateAll(
                (nodes) =>
                  nodes.filter(
                    (node) =>
                      (node as HTMLImageElement).complete &&
                      (node as HTMLImageElement).naturalWidth > 0
                  ).length
              ),
          { message: 'R03_REAL_IMAGE_DECODE_AFTER_LIFECYCLE' }
        )
        .toBeGreaterThan(0);
    }
    const before = await page.evaluate(
      () => (window as unknown as RiskWindow).auditSlider.realIndex
    );
    await page.evaluate(() => (window as unknown as RiskWindow).auditSlider.next());
    await settle(page);
    expect(
      await page.evaluate(() => (window as unknown as RiskWindow).auditSlider.realIndex),
      'R03_RESTARTED_NAVIGATION'
    ).toBe((before + 1) % count);
    await check(page);
    await inertDestroyed(page);
  } finally {
    for (const request of pending.splice(0))
      await request
        .fulfill({ status: 200, contentType: 'image/gif', body: Buffer.from(GIF, 'base64') })
        .catch(() => undefined);
    if (factors.content === 'lazy') await page.unroute('**/risk-media-*.gif', route);
  }
}

async function sendGesture(
  page: Page,
  type: string,
  x: number,
  legacy: boolean,
  root = false
): Promise<void> {
  await page.evaluate(
    ({ type, x, legacy, root }) => {
      const w = window as unknown as RiskWindow;
      const target = root ? w.auditSlider.track : document;
      const y = w.auditSlider.track.getBoundingClientRect().top + 80;
      if (legacy) {
        // Desktop engines can expose the legacy event listener path without a public Touch
        // constructor. Prefer the native TouchEvent class; both are explicitly synthetic.
        let event: Event;
        try {
          event = new TouchEvent(type, { bubbles: true, cancelable: true });
        } catch {
          event = new Event(type, { bubbles: true, cancelable: true });
        }
        const touch = { identifier: 71, clientX: x, clientY: y, target: w.auditSlider.track };
        Object.defineProperties(event, {
          touches: { value: /end|cancel/.test(type) ? [] : [touch] },
          changedTouches: { value: [touch] },
        });
        target.dispatchEvent(event);
      } else
        target.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            cancelable: true,
            pointerId: 71,
            pointerType: 'touch',
            isPrimary: true,
            button: 0,
            clientX: x,
            clientY: y,
          })
        );
    },
    { type, x, legacy, root }
  );
}
async function gestureCancel(page: Page, factors: Record<string, Factor>): Promise<void> {
  const legacy = factors.cancel === 'touchcancel';
  if (legacy) {
    const removed = await page.evaluate(() => {
      const w = window as unknown as RiskWindow;
      w.riskPointer = window.PointerEvent;
      Reflect.deleteProperty(window, 'PointerEvent');
      return !('PointerEvent' in window);
    });
    expect(removed, 'R04_FIXTURE_LEGACY_TOUCH_BRANCH_SELECTED_BEFORE_INIT').toBe(true);
  }
  try {
    await mount(
      page,
      {
        drag: factors.drag === 'off' ? false : factors.drag === 'free' ? 'free' : true,
        loop:
          factors.loop === 'off'
            ? false
            : factors.loop === 'ordinary'
              ? true
              : { withClones: true },
        flickPower: 0,
        freeSnap: true,
      },
      { count: 7, height: 300 }
    );
    await authorHeights(page);
    await positiveSize(page);
    await counters(page);
    const before = await page.evaluate(
      () => getComputedStyle((window as unknown as RiskWindow).auditSlider.container).transform
    );
    let during: string;
    if (factors.cancel === 'lostcapture') {
      await page.evaluate(() => {
        const w = window as unknown as RiskWindow;
        const root = w.auditSlider.root;
        root.addEventListener(
          'pointerdown',
          (event) => {
            root.setPointerCapture(event.pointerId);
            w.riskOwner = {
              pointerId: event.pointerId,
              captured: root.hasPointerCapture(event.pointerId),
            };
          },
          { capture: true, once: true }
        );
        root.addEventListener('lostpointercapture', () => w.riskCounts.lost++);
      });
      const rect = (await page.locator('#audit-slider > .tvist-v1__track').boundingBox())!;
      await page.mouse.move(rect.x + 550, rect.y + 80);
      await page.mouse.down();
      await page.mouse.move(rect.x + 330, rect.y + 80, { steps: 8 });
      during = await page.evaluate(
        () => getComputedStyle((window as unknown as RiskWindow).auditSlider.container).transform
      );
      expect(
        await page.evaluate(() => (window as unknown as RiskWindow).riskOwner?.captured),
        'R04_FIXTURE_ACTUAL_CAPTURE_OWNER'
      ).toBe(true);
      await page.evaluate(() => {
        const w = window as unknown as RiskWindow;
        w.auditSlider.root.releasePointerCapture(w.riskOwner!.pointerId);
      });
      await page.mouse.move(rect.x + 330, rect.y + 80);
      await expect
        .poll(() => page.evaluate(() => (window as unknown as RiskWindow).riskCounts.lost), {
          message: 'R04_REAL_LOST_CAPTURE_OBSERVED',
        })
        .toBe(1);
    } else {
      const x = (await page.locator('#audit-slider > .tvist-v1__track').boundingBox())!.x;
      await sendGesture(page, legacy ? 'touchstart' : 'pointerdown', x + 550, legacy, true);
      await sendGesture(page, legacy ? 'touchmove' : 'pointermove', x + 510, legacy);
      await sendGesture(page, legacy ? 'touchmove' : 'pointermove', x + 330, legacy);
      during = await page.evaluate(
        () => getComputedStyle((window as unknown as RiskWindow).auditSlider.container).transform
      );
      await page.waitForTimeout(120);
      await sendGesture(page, legacy ? 'touchcancel' : 'pointercancel', x + 330, legacy);
    }
    await settle(page);
    const cancelled = await page.evaluate(() => {
      const w = window as unknown as RiskWindow;
      return {
        ...w.riskCounts,
        dragging: w.auditSlider.root.classList.contains('tvist-v1--dragging'),
        transform: getComputedStyle(w.auditSlider.container).transform,
      };
    });
    await phase(page, 'cancel-observation', cancelled);
    expect(cancelled.start, 'R04_GESTURE_FIXTURE_START_COUNT').toBe(factors.drag === 'off' ? 0 : 1);
    if (
      factors.cancel === 'lostcapture' &&
      factors.drag !== 'off' &&
      (cancelled.dragging || cancelled.end !== 1)
    )
      throw new Error(
        `CONTRACT_GAP: R04 lostpointercapture cancellation policy is not specified; actual DOM owner released capture, observed=${JSON.stringify(cancelled)}`
      );
    expect(cancelled.end, 'R04_CANCEL_EVENT_BALANCE').toBe(cancelled.start);
    expect(cancelled.dragging, 'R04_CANCEL_DRAG_CLASS_CLEARED').toBe(false);
    if (factors.drag === 'off')
      expect(cancelled.transform, 'R04_DISABLED_DRAG_DID_NOT_MOVE').toBe(before);
    else expect(during, 'R04_ENABLED_DRAG_REALLY_MOVED_BEFORE_CANCELLATION').not.toBe(before);
    if (factors.cancel === 'lostcapture') {
      await page.mouse.move(20, 80);
      await page.mouse.up();
    } else await sendGesture(page, legacy ? 'touchmove' : 'pointermove', 20, legacy);
    const afterMove = await page.evaluate(
      () => getComputedStyle((window as unknown as RiskWindow).auditSlider.container).transform
    );
    expect(afterMove, 'R04_NO_LATCHED_MOVEMENT_AFTER_CANCEL').toBe(cancelled.transform);
    await check(page);
    await inertDestroyed(page);
  } finally {
    await page.mouse.up();
    await page.evaluate(() => {
      const w = window as unknown as RiskWindow;
      w.auditSlider?.destroy();
      if (w.riskPointer) {
        window.PointerEvent = w.riskPointer;
        delete w.riskPointer;
      }
    });
  }
}

async function breakpointModules(page: Page, factors: Record<string, Factor>): Promise<void> {
  await page.clock.install();
  await page.setViewportSize({ width: 960, height: 720 });
  const modules: Partial<TvistOptions> =
    factors.modules === 'controls'
      ? { arrows: true, pagination: true, scrollbar: true }
      : factors.modules === 'autoplay'
        ? {
            autoplay: {
              delay: 1000,
              pauseOnHover: false,
              pauseOnFocus: false,
              pauseOnInteraction: false,
            },
          }
        : { lazy: { preloadPrevNext: 0 } };
  await mount(
    page,
    {
      enabled: true,
      arrows: false,
      pagination: false,
      scrollbar: false,
      autoplay: false,
      lazy: false,
      breakpointsBase: factors.base as 'window' | 'container',
      breakpoints: { 600: { enabled: Boolean(factors.enabled), ...modules } },
    },
    { width: 800, height: 300 }
  );
  await authorHeights(page);
  await positiveSize(page);
  await counters(page);
  const resize = async (width: number) => {
    if (factors.base === 'window') await page.setViewportSize({ width, height: 720 });
    else
      await page.locator('#audit-slider').evaluate((root, width) => {
        (root as HTMLElement).style.width = `${width}px`;
      }, width);
    await page.clock.runFor(100);
    await settle(page);
    const measured = await page.evaluate(
      (base) =>
        base === 'window'
          ? window.innerWidth
          : (window as unknown as RiskWindow).auditSlider.root.getBoundingClientRect().width,
      factors.base
    );
    expect(
      Math.abs(measured - width),
      'R05_FIXTURE_ACTUALLY_CROSSED_BREAKPOINT'
    ).toBeLessThanOrEqual(1);
  };
  for (let cycle = 0; cycle < 2; cycle++) {
    await phase(page, 'breakpoint-roundtrip', { cycle });
    if (factors.modules === 'lazy')
      await page.evaluate((src) => {
        const w = window as unknown as RiskWindow;
        const image = document.createElement('img');
        image.alt = 'Risk lazy';
        image.dataset.src = src;
        w.auditSlider.slides[0]!.replaceChildren(image);
      }, GIF_URL);
    await resize(500);
    expect(
      await page.evaluate(() => (window as unknown as RiskWindow).auditSlider.isEnabled),
      'R05_BREAKPOINT_ENABLED_STATE'
    ).toBe(factors.enabled);
    if (!factors.enabled) {
      const before = await page.evaluate(() => {
        const w = window as unknown as RiskWindow;
        return { index: w.auditSlider.realIndex, changes: w.riskCounts.changes };
      });
      await page.evaluate(() => (window as unknown as RiskWindow).auditSlider.update());
      await resize(480);
      await page.clock.runFor(2100);
      const disabled = await page.evaluate(() => {
        const w = window as unknown as RiskWindow;
        return {
          index: w.auditSlider.realIndex,
          changes: w.riskCounts.changes,
          controls: w.auditSlider.root.querySelectorAll(
            '.tvist-v1__arrow,.tvist-v1__scrollbar,.tvist-v1__pagination'
          ).length,
          running: w.auditSlider.autoplay?.isRunning() ?? false,
          promoted: w.auditSlider.root.querySelectorAll('img[src]').length,
        };
      });
      expect(
        { index: disabled.index, changes: disabled.changes },
        'R05_DISABLED_RESIZE_NO_NAVIGATION'
      ).toEqual(before);
      expect(disabled.controls, 'R05_DISABLED_CONTROLS_DID_NOT_REAPPEAR').toBe(0);
      expect(disabled.running, 'R05_DISABLED_AUTOPLAY_DID_NOT_RESTART').toBe(false);
      expect(disabled.promoted, 'R05_DISABLED_LAZY_DID_NOT_PROMOTE').toBe(0);
    } else if (factors.modules === 'controls') {
      await expect(page.locator('#audit-slider .tvist-v1__arrow')).toHaveCount(2);
      await expect(page.locator('#audit-slider .tvist-v1__bullet')).toHaveCount(7);
      await expect(page.locator('#audit-slider .tvist-v1__scrollbar-thumb')).toHaveCount(1);
      const before = await page.evaluate(() => {
        const w = window as unknown as RiskWindow;
        return { index: w.auditSlider.realIndex, changes: w.riskCounts.changes };
      });
      await page.locator('#audit-slider .tvist-v1__arrow--next').click();
      await settle(page);
      expect(
        await page.evaluate(() => {
          const w = window as unknown as RiskWindow;
          return { index: w.auditSlider.realIndex, changes: w.riskCounts.changes };
        }),
        'R05_EXACTLY_ONE_CONTROL_LISTENER'
      ).toEqual({ index: before.index + 1, changes: before.changes + 1 });
      await check(page);
    } else if (factors.modules === 'autoplay') {
      const index = await page.evaluate(
        () => (window as unknown as RiskWindow).auditSlider.realIndex
      );
      await page.clock.runFor(1050);
      await settle(page);
      expect(
        await page.evaluate(() => (window as unknown as RiskWindow).auditSlider.realIndex),
        'R05_ENABLED_AUTOPLAY_ADVANCES_ONCE'
      ).toBe(index + 1);
    } else {
      const image = page.locator('#audit-slider [data-case-id="card-0"] img');
      await expect(image).toHaveAttribute('src', GIF_URL);
      await expect(image).not.toHaveAttribute('data-src', /.+/);
    }
    await resize(800);
    await expect
      .poll(() => page.evaluate(() => (window as unknown as RiskWindow).auditSlider.isEnabled), {
        message: 'R05_EXIT_BREAKPOINT_RESTORES_ENABLED',
        timeout: 2000,
      })
      .toBe(true);
    const restored = await page.evaluate(() => {
      const w = window as unknown as RiskWindow;
      return { index: w.auditSlider.realIndex, changes: w.riskCounts.changes };
    });
    await page.clock.runFor(2100);
    expect(
      await page.evaluate(() => {
        const w = window as unknown as RiskWindow;
        return { index: w.auditSlider.realIndex, changes: w.riskCounts.changes };
      }),
      'R05_OFF_BREAKPOINT_NO_GHOST_AUTOPLAY'
    ).toEqual(restored);
    await expect(
      page.locator('#audit-slider .tvist-v1__arrow,.tvist-v1__scrollbar,.tvist-v1__pagination')
    ).toHaveCount(0);
  }
  await inertDestroyed(page);
}

async function nestedAxes(page: Page, factors: Record<string, Factor>): Promise<void> {
  const depth = factors.nested === '3levels' ? 3 : 2;
  await page.evaluate(
    ({ depth, factors }) => {
      const w = window as unknown as RiskWindow;
      w.auditSlider?.destroy({ destroyNested: true });
      document.body.replaceChildren();
      const sizes = [
        [800, 500],
        [570, 350],
        [340, 200],
      ];
      const roots = Array.from({ length: depth }, (_, level) => {
        const root = document.createElement('div');
        root.id = level === 0 ? 'audit-slider' : `risk-nested-${level}`;
        root.className = 'tvist-v1';
        root.style.cssText = `width:${sizes[level]![0]}px;height:${sizes[level]![1]}px`;
        root.innerHTML = `<div class="tvist-v1__track"><div class="tvist-v1__container">${Array.from({ length: 4 }, (_, i) => `<div class="tvist-v1__slide" data-case-id="card-${i}">${level}:${i}</div>`).join('')}</div></div>`;
        return root;
      });
      const style = document.createElement('style');
      style.textContent = roots
        .map(
          (root, level) =>
            `#${root.id} > .tvist-v1__track, #${root.id} > .tvist-v1__track > .tvist-v1__container > .tvist-v1__slide { height:${sizes[level]![1]}px; }`
        )
        .join('\n');
      document.head.append(style);
      for (let level = 0; level < depth - 1; level++)
        roots[level]!.querySelector('.tvist-v1__slide')!.replaceChildren(roots[level + 1]!);
      document.body.append(roots[0]!);
      const instances: Tvist[] = [];
      const order = Array.from({ length: depth }, (_, i) => i);
      if (factors.init === 'childfirst') order.reverse();
      for (const level of order)
        instances[level] = new w.TvistV1(roots[level]!, {
          direction: factors.axes === 'mixed' && level % 2 === 1 ? 'vertical' : 'horizontal',
          speed: 0,
          visibility: false,
          flickPower: 0,
        });
      w.riskNested = instances;
      w.auditSlider = instances[0]!;
      w.auditOriginals = [...instances[0]!.slides];
    },
    { depth, factors }
  );
  await settle(page);
  await counters(page);
  for (let level = 0; level < depth; level++)
    await positiveSize(
      page,
      `${level === 0 ? '#audit-slider' : `#risk-nested-${level}`} > .tvist-v1__track`
    );
  const selector = `#risk-nested-${depth - 1} > .tvist-v1__track`;
  const vertical = factors.axes === 'mixed' && (depth - 1) % 2 === 1;
  await rawDrag(page, selector, vertical, vertical ? 230 : 260);
  const indices = await page.evaluate(() =>
    (window as unknown as RiskWindow).riskNested!.map((slider) => slider.realIndex)
  );
  expect(indices.slice(0, -1), 'R09_CHILD_GESTURE_MUST_NOT_MOVE_ANCESTORS').toEqual(
    Array(depth - 1).fill(0)
  );
  expect(indices[depth - 1], 'R09_CHILD_GESTURE_REALLY_MOVED').toBeGreaterThan(0);
  await check(page);
  await phase(page, 'child-gesture-isolated', { indices });
  await page.evaluate(() =>
    (window as unknown as RiskWindow).auditSlider.destroy({ destroyNested: false })
  );
  await positiveSize(page, selector);
  await rawDrag(page, selector, vertical, vertical ? 230 : 260);
  const after = await page.evaluate(() =>
    (window as unknown as RiskWindow).riskNested!.map((slider) => slider.realIndex)
  );
  expect(after[depth - 1], 'R09_CHILD_SURVIVES_PARENT_DESTROY').toBeGreaterThan(
    indices[depth - 1]!
  );
  await page.evaluate(() => {
    const w = window as unknown as RiskWindow;
    for (const child of w.riskNested!.slice(1).reverse()) child.destroy();
  });
  await inertDestroyed(page);
}

async function assertFreeControls(
  page: Page,
  scrollbar: boolean
): Promise<{ failures: string[]; ambiguous: boolean }> {
  const state = await page.evaluate(() => {
    const w = window as unknown as RiskWindow;
    const s = w.auditSlider;
    const track = s.track.getBoundingClientRect();
    const cards = s.slides.map((slide) => slide.getBoundingClientRect());
    const distances = cards.map((card) => Math.abs(card.left - track.left));
    const nearest = distances.indexOf(Math.min(...distances));
    const bar = s.root.querySelector<HTMLElement>('.tvist-v1__scrollbar');
    const thumb = s.root.querySelector<HTMLElement>('.tvist-v1__scrollbar-thumb');
    const barRect = bar?.getBoundingClientRect();
    const thumbRect = thumb?.getBoundingClientRect();
    const range = cards[cards.length - 1]!.left - cards[0]!.left;
    return {
      nearest,
      count: cards.length,
      active: s.realIndex,
      freeSnap: s.options.freeSnap,
      distance: distances[nearest],
      range,
      offset: track.left - cards[0]!.left,
      bullets: [
        ...s.root.querySelectorAll<HTMLElement>('.tvist-v1__bullet[aria-current="true"]'),
      ].map((node) => Number(node.dataset.index)),
      fraction: s.root.querySelector('.tvist-v1__pagination')?.textContent?.trim(),
      progress: s.root.querySelector<HTMLElement>('.tvist-v1__pagination-progress-bar')?.style
        .width,
      type: typeof s.options.pagination === 'object' ? s.options.pagination.type : undefined,
      scrollbar:
        barRect && thumbRect
          ? {
              width: barRect.width,
              thumbWidth: thumbRect.width,
              thumbLeft: thumbRect.left - barRect.left,
            }
          : null,
    };
  });
  expect(state.range, 'R10_FIXTURE_NONZERO_SCROLL_RANGE').toBeGreaterThan(1000);
  const failures: string[] = [];
  const assert = (operation: () => void) => {
    try {
      operation();
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    }
  };
  // The public pagination docs do not specify committed-vs-nearest policy between
  // snap positions. Retain observations and allow either; exact snap points are unambiguous.
  await phase(page, 'control-observation', {
    nearest: state.nearest,
    publicRealIndex: state.active,
    offset: state.offset,
    fraction: state.fraction,
    bullets: state.bullets,
    progress: state.progress,
    scrollbar: state.scrollbar,
  });
  const snapped = state.freeSnap || state.distance <= 1;
  const allowed = snapped ? [state.nearest] : [...new Set([state.active, state.nearest])];
  if (snapped)
    assert(() =>
      expect(state.active, 'R10_SNAPPED_RENDERED_SLIDE_IS_PUBLIC_ACTIVE').toBe(state.nearest)
    );
  if (state.type === 'bullets')
    assert(() => {
      expect(state.bullets.length, 'R10_EXACTLY_ONE_SELECTED_BULLET').toBe(1);
      expect(allowed, 'R10_BULLET_MATCHES_ALLOWED_PAGE').toContain(state.bullets[0]);
    });
  if (state.type === 'fraction')
    assert(() => {
      const numbers = state.fraction?.match(/\d+/g)?.map(Number) ?? [];
      expect(numbers.length, 'R10_FRACTION_HAS_CURRENT_AND_TOTAL').toBe(2);
      expect(numbers[1], 'R10_FRACTION_TOTAL').toBe(state.count);
      expect(allowed, 'R10_FRACTION_MATCHES_ALLOWED_PAGE').toContain(numbers[0]! - 1);
    });
  if (state.type === 'progress')
    assert(() => {
      const actual = Number.parseFloat(state.progress ?? '');
      expect(
        allowed.some((index) => Math.abs(actual - ((index + 1) / state.count) * 100) < 0.001),
        'R10_PROGRESS_MATCHES_ALLOWED_PAGE'
      ).toBe(true);
    });
  if (scrollbar) {
    assert(() => {
      expect(state.scrollbar, 'R10_SCROLLBAR_EXISTS').not.toBeNull();
      expect(state.scrollbar!.width, 'R10_SCROLLBAR_POSITIVE_SIZE').toBeGreaterThan(100);
      expect(state.scrollbar!.thumbWidth, 'R10_SCROLLBAR_POSITIVE_THUMB').toBeGreaterThan(5);
      const expected =
        Math.max(0, Math.min(1, state.offset / state.range)) *
        (state.scrollbar!.width - state.scrollbar!.thumbWidth);
      expect(
        Math.abs(state.scrollbar!.thumbLeft - expected),
        'R10_SCROLLBAR_MATCHES_RENDERED_FREE_POSITION'
      ).toBeLessThanOrEqual(1.5);
    });
  } else assert(() => expect(state.scrollbar, 'R10_SCROLLBAR_FALSE_HAS_NO_CONTROL').toBeNull());
  try {
    await check(page);
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error));
  }
  return { failures, ambiguous: !snapped && state.nearest !== state.active };
}
async function freeControls(page: Page, factors: Record<string, Factor>): Promise<void> {
  await mount(
    page,
    {
      drag: 'free',
      freeSnap: Boolean(factors.freeSnap),
      flickPower: 0,
      speed: 120,
      pagination: { type: factors.pagination as 'bullets' | 'fraction' | 'progress' },
      scrollbar: Boolean(factors.scrollbar),
    },
    { width: 480, height: 300 }
  );
  await authorHeights(page);
  await positiveSize(page);
  await counters(page);
  const failures: string[] = [];
  let ambiguous = false;
  const observe = async (stage: string) => {
    await phase(page, stage);
    const result = await assertFreeControls(page, Boolean(factors.scrollbar));
    failures.push(...result.failures.map((message) => `${message}\nR10_STAGE ${stage}`));
    ambiguous ||= result.ambiguous;
  };
  await observe('before-drag');
  await rawDrag(page, '#audit-slider > .tvist-v1__track', false, 330);
  const movement = await page.evaluate(() => {
    const s = (window as unknown as RiskWindow).auditSlider;
    const left = s.track.getBoundingClientRect().left;
    return {
      offset: left - s.slides[0]!.getBoundingClientRect().left,
      nearest: Math.min(
        ...s.slides.map((node) => Math.abs(node.getBoundingClientRect().left - left))
      ),
    };
  });
  expect(movement.offset, 'R10_REAL_FREE_DRAG_MOVED').toBeGreaterThan(100);
  if (factors.freeSnap)
    expect(movement.nearest, 'R10_FREE_SNAP_ALIGNS_RENDERED_CARD').toBeLessThanOrEqual(1);
  else expect(movement.nearest, 'R10_FREE_NO_SNAP_RETAINS_INTERIOR_OFFSET').toBeGreaterThan(20);
  await observe('after-free-drag');
  if (factors.scrollbar) {
    const box = (await page.locator('#audit-slider .tvist-v1__scrollbar-thumb').boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 180, box.y + box.height / 2, { steps: 12 });
    await page.mouse.up();
    await settle(page);
    const location = await page.evaluate(() => {
      const s = (window as unknown as RiskWindow).auditSlider;
      return s.track.getBoundingClientRect().left - s.slides[0]!.getBoundingClientRect().left;
    });
    expect(
      Math.abs(location - movement.offset),
      'R10_REAL_SCROLLBAR_GESTURE_REALLY_MOVED'
    ).toBeGreaterThan(100);
    await observe('after-scrollbar-drag');
  }
  const target = await page.evaluate(() => {
    const s = (window as unknown as RiskWindow).auditSlider;
    const target = s.realIndex === 3 ? 5 : 3;
    s.scrollTo(target);
    return target;
  });
  await settle(page);
  expect(
    await page.evaluate(() => (window as unknown as RiskWindow).auditSlider.realIndex),
    'R10_EXPLICIT_NAVIGATION_TARGET_REACHABLE'
  ).toBe(target);
  await observe('after-exact-navigation');
  const counts = await page.evaluate(() => (window as unknown as RiskWindow).riskCounts);
  expect(counts.start, 'R10_REAL_DRAG_STARTED_ONCE').toBe(1);
  expect(counts.end, 'R10_REAL_DRAG_ENDED_ONCE').toBe(1);
  await inertDestroyed(page);
  if (failures.length) throw new Error(failures.join('\nR10_ADDITIONAL_OBSERVATION '));
  if (ambiguous)
    throw new Error(
      'CONTRACT_GAP: R10 pagination for an unsnapped free position does not specify committed realIndex versus nearest rendered card; admissible observations recorded, exact target and teardown verified.'
    );
}

/** A fresh browser document is required for each tuple, including legacy-input capability overrides. */
export async function runRiskInputCase(page: Page, id: string): Promise<void> {
  const definition = riskInputCases.find((value) => value.id === id);
  if (!definition) throw new Error(`RISK_INPUT_UNKNOWN_CASE: ${id}`);
  await page.evaluate(() => {
    (window as unknown as RiskWindow).riskEvidence = [];
  });
  await phase(page, 'tuple', { id, family: definition.family, factors: definition.factors });
  try {
    if (definition.family === 'R03') await cloneMedia(page, definition.factors);
    else if (definition.family === 'R04') await gestureCancel(page, definition.factors);
    else if (definition.family === 'R05') await breakpointModules(page, definition.factors);
    else if (definition.family === 'R09') await nestedAxes(page, definition.factors);
    else if (definition.family === 'R10') await freeControls(page, definition.factors);
    await phase(page, 'complete');
  } catch (error) {
    const evidence = await page
      .evaluate(() => (window as unknown as RiskWindow).riskEvidence)
      .catch(() => []);
    throw new Error(
      `${error instanceof Error ? error.message : String(error)}\nRISK_INPUT_EVIDENCE ${JSON.stringify(evidence)}`
    );
  }
}
