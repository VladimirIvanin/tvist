import { expect, type Page } from '@playwright/test';
import type { Tvist } from '../../src/core/Tvist';
import type { AutoplayControls } from '../../src/core/types';
import { mount, settle, type AuditWindow } from './browser-fixture';
import type { AuditCase } from './types';

const autoplaySource =
  'https://github.com/nolimits4web/swiper/commit/ef055a6dbfe175fd13590eef7bcf384fee20a133';
const lazySource =
  'https://github.com/nolimits4web/swiper/commit/eb02f3ce28aec376a055ac7ca9490f6c3788d0c2';
export const sourceMediaCases: AuditCase[] = [
  {
    id: 'SRC-M01',
    title: 'Retained autoplay start and stop stay inert after destroy and same-root reinit',
    family: 'resources',
    priority: 'P0',
    sources: [autoplaySource, 'https://github.com/nolimits4web/swiper/issues/8036'],
  },
  {
    id: 'SRC-M02',
    title:
      'Pending native image load cannot mutate retained DOM or call slider callbacks after destroy',
    family: 'resources',
    priority: 'P1',
    sources: [lazySource, 'https://github.com/nolimits4web/swiper/issues/8223'],
  },
  {
    id: 'SRC-M03',
    title:
      'Pending native image error cannot mutate retained DOM or call slider callbacks after destroy',
    family: 'resources',
    priority: 'P1',
    sources: [lazySource, 'https://github.com/nolimits4web/swiper/issues/8223'],
  },
];

interface SourceState {
  old: Tvist;
  oldRoot: HTMLElement;
  controls?: AutoplayControls;
  image?: HTMLImageElement;
  oldEvents: number;
  newEvents: number;
  loads: number;
  errors: number;
  mutations: number;
  observer?: MutationObserver;
  baseline?: {
    oldIndex: number;
    newIndex: number;
    oldHtml: string;
    newHtml: string;
    oldEvents: number;
    newEvents: number;
  };
  operations: { operation: string; running?: boolean; error?: string }[];
}
type SourceWindow = AuditWindow & { auditSourceMedia: SourceState };

async function saveBaseline(page: Page): Promise<void> {
  await settle(page);
  await page.evaluate(() => {
    const w = window as unknown as SourceWindow;
    const state = w.auditSourceMedia;
    state.baseline = {
      oldIndex: state.old.realIndex,
      newIndex: w.auditSlider.realIndex,
      oldHtml: state.oldRoot.outerHTML,
      newHtml: w.auditSlider.root.outerHTML,
      oldEvents: state.oldEvents,
      newEvents: state.newEvents,
    };
    state.observer = new MutationObserver((records) => {
      state.mutations += records.length;
    });
    state.observer.observe(state.oldRoot, { attributes: true, childList: true, subtree: true });
  });
}

async function checkIsolation(page: Page): Promise<void> {
  const observed = await page.evaluate(() => {
    const w = window as unknown as SourceWindow;
    const state = w.auditSourceMedia;
    const before = state.baseline!;
    return {
      oldIndexUnchanged: state.old.realIndex === before.oldIndex,
      newIndexUnchanged: w.auditSlider.realIndex === before.newIndex,
      oldDomUnchanged: state.oldRoot.outerHTML === before.oldHtml,
      newDomUnchanged: w.auditSlider.root.outerHTML === before.newHtml,
      oldCallbacks: state.oldEvents - before.oldEvents,
      newCallbacks: state.newEvents - before.newEvents,
      oldDomMutations: state.mutations,
    };
  });
  expect(observed, 'destroyed-owner-isolation').toEqual({
    oldIndexUnchanged: true,
    newIndexUnchanged: true,
    oldDomUnchanged: true,
    newDomUnchanged: true,
    oldCallbacks: 0,
    newCallbacks: 0,
    oldDomMutations: 0,
  });
}

export async function runSourceMediaCase(page: Page, id: string): Promise<void> {
  if (!sourceMediaCases.some((entry) => entry.id === id))
    throw new Error(`Unknown source media case ${id}`);
  if (id === 'SRC-M01') {
    await mount(
      page,
      {
        rewind: true,
        autoplay: {
          delay: 160,
          pauseOnHover: false,
          pauseOnFocus: false,
          pauseOnInteraction: false,
        },
      },
      { count: 3 }
    );
    const initiallyRunning = await page.evaluate(() => {
      const w = window as unknown as SourceWindow;
      const old = w.auditSlider;
      const state: SourceState = {
        old,
        oldRoot: old.root,
        controls: old.autoplay!,
        oldEvents: 0,
        newEvents: 0,
        loads: 0,
        errors: 0,
        mutations: 0,
        operations: [],
      };
      w.auditSourceMedia = state;
      for (const event of ['autoplayStart', 'autoplayStop', 'autoplayProgress', 'slideChangeEnd'])
        old.on(event, () => state.oldEvents++);
      const running = state.controls!.isRunning();
      old.destroy();
      w.auditSlider = new w.TvistV1(old.root, { speed: 0, visibility: false, autoplay: false });
      for (const event of ['autoplayStart', 'autoplayStop', 'autoplayProgress', 'slideChangeEnd'])
        w.auditSlider.on(event, () => state.newEvents++);
      w.auditSlider.next();
      return running;
    });
    expect(initiallyRunning, 'retained-controls-positive-running-precondition').toBe(true);
    await saveBaseline(page);
    try {
      await page.evaluate(() => {
        const state = (window as unknown as SourceWindow).auditSourceMedia;
        for (const operation of ['start', 'stop'] as const) {
          try {
            state.controls![operation]();
            state.operations.push({ operation, running: state.controls!.isRunning() });
          } catch (error) {
            state.operations.push({ operation, error: String(error) });
          }
        }
        // Real user-owned delayed work can outlive the slider; this is not a fake clock.
        setTimeout(() => {
          try {
            state.controls!.start();
            state.operations.push({
              operation: 'delayed-start',
              running: state.controls!.isRunning(),
            });
          } catch (error) {
            state.operations.push({ operation: 'delayed-start', error: String(error) });
          }
        }, 30);
      });
      await page.waitForTimeout(430);
      await page.evaluate(() => {
        const state = (window as unknown as SourceWindow).auditSourceMedia;
        try {
          state.controls!.stop();
          state.operations.push({
            operation: 'delayed-stop',
            running: state.controls!.isRunning(),
          });
        } catch (error) {
          state.operations.push({ operation: 'delayed-stop', error: String(error) });
        }
      });
      await page.waitForTimeout(50);
      // Collect all observations before asserting, so a revived running flag does
      // not prevent the delayed callbacks and DOM isolation from being exercised.
      const operations = await page.evaluate(
        () => (window as unknown as SourceWindow).auditSourceMedia.operations
      );
      try {
        await checkIsolation(page);
      } catch (error) {
        throw new Error(
          `CONTRACT_GAP: explicitly calling retained autoplay controls after destroy mutates their old owner/shared root; post-destroy calls are unspecified. ${String(error)} Operations=${JSON.stringify(operations)}`
        );
      }
      if (operations.some((operation) => operation.running === true))
        throw new Error(
          `CONTRACT_GAP: retained autoplay controls can restart their destroyed owner; public post-destroy control-call behavior is unspecified. Owner isolation was checked first. Operations=${JSON.stringify(operations)}`
        );
      expect(operations, 'retained-controls-after-destroy-stay-inert').toEqual([
        { operation: 'start', running: false },
        { operation: 'stop', running: false },
        { operation: 'delayed-start', running: false },
        { operation: 'delayed-stop', running: false },
      ]);
    } finally {
      await page.evaluate(() => {
        const state = (window as unknown as SourceWindow).auditSourceMedia;
        state.controls!.stop();
        state.observer?.disconnect();
      });
    }
    return;
  }

  const success = id === 'SRC-M02';
  const path = `/audit-source-image?case=${id}`;
  let release!: () => void;
  let received!: () => void;
  const gate = new Promise<void>((done) => {
    release = done;
  });
  const requested = new Promise<void>((done) => {
    received = done;
  });
  await page.route(`**${path}`, async (route) => {
    received();
    await gate;
    await route.fulfill(
      success
        ? {
            status: 200,
            contentType: 'image/svg+xml',
            body: '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="red"/></svg>',
          }
        : { status: 200, contentType: 'image/png', body: 'intentional invalid image bytes' }
    );
  });
  try {
    await mount(
      page,
      { lazy: { preloadPrevNext: 0 } },
      {
        count: 3,
        contents: [
          `<img data-source-image alt="Pending source fixture" data-src="${path}" width="40" height="40">`,
          'Second',
          'Third',
        ],
      }
    );
    await Promise.race([
      requested,
      page.waitForTimeout(3000).then(() => {
        throw new Error('SOURCE_FIXTURE: lazy request did not start');
      }),
    ]);
    const pending = await page.evaluate(() => {
      const w = window as unknown as SourceWindow;
      const old = w.auditSlider;
      const image = old.root.querySelector<HTMLImageElement>('[data-source-image]')!;
      const state: SourceState = {
        old,
        oldRoot: old.root,
        image,
        oldEvents: 0,
        newEvents: 0,
        loads: 0,
        errors: 0,
        mutations: 0,
        operations: [],
      };
      w.auditSourceMedia = state;
      image.addEventListener('load', () => state.loads++, { once: true });
      image.addEventListener('error', () => state.errors++, { once: true });
      old.on('lazyLoaded', () => state.oldEvents++);
      old.on('lazyLoadError', () => state.oldEvents++);
      const pending = !image.complete;
      old.destroy();
      // Keep old image/DOM alive and connected, as an application retaining a
      // card would. A separate healthy successor must not receive old callbacks.
      const root = document.createElement('div');
      root.id = 'source-media-successor';
      root.className = 'tvist-v1';
      root.style.cssText = 'width:720px;height:180px';
      root.innerHTML =
        '<div class="tvist-v1__track"><div class="tvist-v1__container"><div class="tvist-v1__slide">New one</div><div class="tvist-v1__slide">New two</div><div class="tvist-v1__slide">New three</div></div></div>';
      document.body.append(root);
      w.auditSlider = new w.TvistV1(root, { speed: 0, visibility: false, lazy: false });
      for (const event of ['lazyLoaded', 'lazyLoadError', 'slideChangeEnd'])
        w.auditSlider.on(event, () => state.newEvents++);
      w.auditSlider.next();
      return pending;
    });
    expect(pending, 'native-image-pending-before-destroy').toBe(true);
    await saveBaseline(page);
    release();
    await page.waitForFunction(
      () => {
        const state = (window as unknown as SourceWindow).auditSourceMedia;
        return state.loads + state.errors > 0;
      },
      undefined,
      { polling: 25, timeout: 5000 }
    );
    await page.waitForTimeout(50);
    const completion = await page.evaluate(() => {
      const state = (window as unknown as SourceWindow).auditSourceMedia;
      return {
        loads: state.loads,
        errors: state.errors,
        complete: state.image!.complete,
        width: state.image!.naturalWidth,
      };
    });
    expect(completion.loads, 'real-image-load-event').toBe(success ? 1 : 0);
    expect(completion.errors, 'real-image-error-event').toBe(success ? 0 : 1);
    expect(completion.complete, 'real-image-completed').toBe(true);
    expect(
      success ? completion.width > 0 : completion.width === 0,
      'real-image-decode-outcome'
    ).toBe(true);
    await checkIsolation(page);
  } finally {
    release();
    await page.unrouteAll({ behavior: 'wait' });
    await page.evaluate(() =>
      (window as unknown as SourceWindow).auditSourceMedia?.observer?.disconnect()
    );
  }
}
