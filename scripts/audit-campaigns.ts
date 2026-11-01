import { expect, type Page } from '@playwright/test';
import type { Tvist } from '../src/core/Tvist';
import { check, mount, settle, type AuditWindow } from '../tests/audit/browser-fixture';
import { coverageHoles, resourceLeakErrors, type ResourceCounts } from '../tests/audit/dom-oracles';

export interface CampaignCommand {
  action: string;
  value: number;
  direction: 'next' | 'prev';
}
export const statefulFamilies = [
  'loop-navigation',
  'gestures-controls',
  'sync-nesting',
  'breakpoints-layout',
  'media-visibility',
  'grid-lifecycle',
] as const;
const commandsByFamily = [
  ['next', 'prev', 'jump', 'group', 'loop-mode', 'resize', 'cycle', 'peek'],
  ['drag-left', 'drag-right', 'cancel-drag', 'wheel', 'drag-mode', 'resize', 'cycle', 'click-next'],
  [
    'main-next',
    'thumb-next',
    'thumb-click',
    'thumb-cycle',
    'sync-drag',
    'child-drag',
    'resize',
    'main-prev',
  ],
  ['viewport', 'viewport', 'container', 'axis', 'center', 'gap', 'cycle', 'jump'],
  [
    'advance-media',
    'hover',
    'focus',
    'visibility',
    'stop-start',
    'pause-resume',
    'video-ended',
    'cycle',
  ],
  ['next', 'prev', 'grid-shape', 'grid-gap', 'axis', 'cycle', 'append', 'filter'],
] as const;

/** The replay contains concrete commands; generation is deterministic and independent of browser timing. */
export function serializeCommands(family: number, seed: number, steps: number): CampaignCommand[] {
  if (!Number.isInteger(family) || family < 0 || family >= commandsByFamily.length)
    throw new Error('CAMPAIGN_INVALID_FAMILY');
  if (!Number.isInteger(steps) || steps < 0) throw new Error('CAMPAIGN_INVALID_STEPS');
  let state = seed >>> 0;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state;
  };
  return Array.from({ length: steps }, () => {
    const key = random();
    // Low LCG bits repeat at this two-draw cadence; use high bits so a single replay
    // actually alternates boolean options, movement directions and layout states.
    const value = random() >>> 8;
    return {
      action: commandsByFamily[family]![(key >>> 16) % 8]!,
      value,
      direction: value % 2 ? 'next' : 'prev',
    };
  });
}

type CampaignWindow = AuditWindow & {
  auditPartner?: Tvist;
  auditNested?: Tvist;
  auditCommandHistory?: CampaignCommand[];
  auditResourceProbe?: { counts(): ResourceCounts; restore(): void };
  auditCampaignMetrics?: unknown;
};

async function realDrag(
  page: Page,
  selector: string,
  delta: number,
  cancel = false
): Promise<void> {
  const box = await page.locator(selector).boundingBox();
  if (!box || box.width <= 0 || box.height <= 0)
    throw new Error(`CAMPAIGN_FIXTURE_MISSING: ${selector}`);
  const startX = box.x + box.width * (delta < 0 ? 0.8 : 0.2);
  const y = box.y + Math.min(box.height * 0.35, 80);
  await page.mouse.move(startX, y);
  await page.mouse.down();
  await page.mouse.move(startX + delta, y, { steps: 10 });
  if (cancel) {
    // Explicit synthetic cancellation after a real drag; this does not claim native touch coverage.
    await page.evaluate(() =>
      document.dispatchEvent(
        new PointerEvent('pointercancel', {
          pointerId: 1,
          pointerType: 'mouse',
          bubbles: true,
          button: 0,
        })
      )
    );
  }
  await page.mouse.up();
  await settle(page);
}

async function installPartner(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as CampaignWindow;
    const create = (id: string, width: number, height: number, count: number) => {
      const root = document.createElement('div');
      root.id = id;
      root.className = 'tvist-v1';
      root.style.cssText = `width:${width}px;height:${height}px`;
      root.innerHTML = `<div class="tvist-v1__track" style="height:${height}px"><div class="tvist-v1__container">${Array.from({ length: count }, (_, i) => `<div class="tvist-v1__slide" data-case-id="card-${i}" style="height:${height}px">${i}</div>`).join('')}</div></div>`;
      return root;
    };
    const partner = create('campaign-thumbs', 720, 120, 12);
    document.body.append(partner);
    w.auditPartner = new w.TvistV1(partner, {
      perPage: 3,
      isNavigation: true,
      speed: 0,
      visibility: false,
    });
    w.auditSlider.sync(w.auditPartner);
    const nested = create('campaign-child', 400, 160, 4);
    w.auditSlider.slides[0]!.replaceChildren(nested);
    w.auditNested = new w.TvistV1(nested, { speed: 0, visibility: false });
  });
}

async function setupFamily(page: Page, family: number): Promise<void> {
  if (family === 4) await page.clock.install();
  await mount(
    page,
    {
      loop: family === 0,
      arrows: true,
      pagination: true,
      speed: 0,
      ...(family === 1
        ? { drag: 'free' as const, freeSnap: true, wheel: true, scrollbar: true }
        : {}),
      ...(family === 3
        ? { breakpoints: { 767: { perPage: 1 }, 1023: { perPage: 2 } }, perPage: 3 }
        : {}),
      ...(family === 4
        ? {
            visibility: true,
            autoplay: { delay: 400, pauseOnHover: true, pauseOnFocus: true },
            video: true,
          }
        : {}),
      ...(family === 5 ? { grid: { rows: 2, cols: 2 }, gap: 12 } : {}),
    },
    {
      count: 12,
      ...(family === 4
        ? {
            contents: [
              '<button id="campaign-focus">Pause focus</button>',
              '<video muted playsinline></video>',
              ...Array.from({ length: 10 }, (_, i) => `Card ${i + 2}`),
            ],
          }
        : {}),
    }
  );
  if (family === 2) await installPartner(page);
  await page.evaluate(() => {
    (window as unknown as CampaignWindow).auditCommandHistory = [];
  });
}

async function executeCommand(page: Page, family: number, command: CampaignCommand): Promise<void> {
  if (command.action === 'sync-drag') {
    const sync = command.value % 2 === 0;
    await page.evaluate(
      (sync) =>
        (window as unknown as CampaignWindow).auditPartner!.updateOptions({ syncOnDrag: sync }),
      sync
    );
    const before = await page.evaluate(
      () => (window as unknown as CampaignWindow).auditSlider.realIndex
    );
    await realDrag(
      page,
      '#campaign-thumbs > .tvist-v1__track',
      command.direction === 'next' ? -260 : 260
    );
    const after = await page.evaluate(() => {
      const w = window as unknown as CampaignWindow;
      return { main: w.auditSlider.realIndex, partner: w.auditPartner!.realIndex };
    });
    expect(after.main, 'STATEFUL_SYNC_DRAG_POLICY').toBe(sync ? after.partner : before);
    return;
  }
  if (['drag-left', 'drag-right', 'cancel-drag'].includes(command.action)) {
    await realDrag(
      page,
      '#audit-slider > .tvist-v1__track',
      command.action === 'drag-right' ? 260 : -260,
      command.action === 'cancel-drag'
    );
    return;
  }
  if (command.action === 'child-drag') {
    await page.evaluate(() => (window as unknown as CampaignWindow).auditSlider.scrollTo(0, true));
    await settle(page);
    const before = await page.evaluate(
      () => (window as unknown as CampaignWindow).auditSlider.realIndex
    );
    await realDrag(page, '#campaign-child > .tvist-v1__track', -230);
    expect(
      await page.evaluate(() => (window as unknown as CampaignWindow).auditSlider.realIndex),
      'STATEFUL_NESTED_ISOLATION'
    ).toBe(before);
    return;
  }
  if (command.action === 'wheel') {
    const box = (await page.locator('#audit-slider').boundingBox())!;
    await page.mouse.move(box.x + 200, box.y + 80);
    await page.mouse.wheel(0, command.direction === 'next' ? 160 : -160);
    await settle(page);
    return;
  }
  if (command.action === 'viewport') {
    await page.setViewportSize({
      width: [375, 767, 768, 1023, 1024, 1280][command.value % 6]!,
      height: 900,
    });
    await page.waitForTimeout(120);
    return;
  }
  if (command.action === 'advance-media') {
    await page.clock.runFor(450);
    return;
  }
  const result = await page.evaluate(
    ({ family, command }) => {
      const w = window as unknown as CampaignWindow;
      const s = w.auditSlider;
      const indexBefore = s.realIndex;
      let expectedCount: number | undefined;
      switch (command.action) {
        case 'next':
        case 'main-next':
          s.next();
          break;
        case 'prev':
        case 'main-prev':
          s.prev();
          break;
        case 'jump':
          s.scrollTo(command.value % Math.max(1, s.originalSlideCount), true);
          break;
        case 'group':
          s.updateOptions({ slidesPerGroup: [1, 2, 3][command.value % 3] });
          break;
        case 'loop-mode':
          s.updateOptions({ loop: command.value % 2 ? true : { withClones: true } });
          break;
        case 'resize':
        case 'container':
          s.root.style.width = `${[400, 600, 720, 900][command.value % 4]}px`;
          s.update();
          break;
        case 'cycle':
          s.disable();
          s.enable();
          break;
        case 'peek':
          s.updateOptions({ peek: command.value % 2 ? { left: 20, right: 60 } : 0 });
          break;
        case 'drag-mode':
          s.updateOptions({ drag: command.value % 2 ? 'free' : true, freeSnap: true });
          break;
        case 'click-next':
          s.root.querySelector<HTMLButtonElement>('.tvist-v1__arrow--next')!.click();
          break;
        case 'thumb-next':
          w.auditPartner!.next();
          break;
        case 'thumb-click': {
          const target = command.value % 12;
          w.auditPartner!.scrollTo(target, true);
          w.auditPartner!.slides[w.auditPartner!.activeIndex]!.click();
          break;
        }
        case 'thumb-cycle':
          w.auditPartner!.disable();
          s.scrollTo(command.value % 12, true);
          w.auditPartner!.enable();
          break;
        case 'sync-drag':
          w.auditPartner!.updateOptions({ syncOnDrag: command.value % 2 === 0 });
          break;
        case 'axis':
          s.updateOptions({ direction: command.value % 2 ? 'vertical' : 'horizontal' });
          break;
        case 'center':
          s.updateOptions({ center: command.value % 2 ? { focus: true } : false });
          break;
        case 'gap':
          s.updateOptions({ gap: command.value % 2 ? '1rem' : 0 });
          break;
        case 'hover':
          s.root.dispatchEvent(new MouseEvent(command.value % 2 ? 'mouseenter' : 'mouseleave'));
          break;
        case 'focus': {
          const button = document.getElementById('campaign-focus')!;
          if (command.value % 2) button.focus();
          else button.blur();
          break;
        }
        case 'visibility':
          s.root.style.display = command.value % 2 ? 'none' : '';
          s.visibility!.check();
          break;
        case 'stop-start':
          if (command.value % 2) s.autoplay!.stop();
          else s.autoplay!.start();
          break;
        case 'pause-resume':
          if (command.value % 2) s.autoplay!.pause();
          else s.autoplay!.resume();
          break;
        case 'video-ended':
          s.root.querySelector('video')!.dispatchEvent(new Event('ended'));
          break;
        case 'grid-shape':
          s.updateOptions({
            grid: command.value % 2 ? { rows: 1, cols: 3 } : { rows: 2, cols: 2 },
          });
          break;
        case 'grid-gap':
          s.updateOptions({ grid: { rows: 2, cols: 2, gap: { row: 8, col: 18 } } });
          break;
        case 'append': {
          const cards = [...s.root.querySelectorAll<HTMLElement>('[data-case-id]')];
          const newCard = document.createElement('div');
          newCard.className = 'tvist-v1__slide';
          newCard.dataset.caseId = `card-${cards.length}`;
          newCard.textContent = newCard.dataset.caseId;
          newCard.style.height = '360px';
          // For grid this is an original card appended to the exposed container; contract is deliberately exercised.
          s.container.append(newCard);
          s.update();
          expectedCount = cards.length + 1;
          break;
        }
        case 'filter': {
          const cards = [...s.root.querySelectorAll<HTMLElement>('[data-case-id]')];
          const target = cards[command.value % cards.length];
          if (target) target.style.display = target.style.display === 'none' ? '' : 'none';
          s.update();
          break;
        }
        default:
          throw new Error(`Unknown campaign action ${command.action}`);
      }
      const actualCards = [...s.root.querySelectorAll<HTMLElement>('[data-case-id]')].filter(
        (card) => getComputedStyle(card).display !== 'none'
      );
      return {
        indexBefore,
        expectedCount,
        connected: s.slides.every((slide) => slide.isConnected),
        cards: actualCards.length,
        totalCards: s.root.querySelectorAll('[data-case-id]').length,
        family,
      };
    },
    { family, command }
  );
  expect(result.connected, 'STATEFUL_DISCONNECTED_PUBLIC_SLIDE').toBe(true);
  if (result.expectedCount !== undefined)
    expect(result.totalCards, 'STATEFUL_APPENDED_CARD_PRESERVED').toBe(result.expectedCount);
}

export async function stateful(
  page: Page,
  family: number,
  seed: number,
  steps: number,
  commandsOverride?: CampaignCommand[]
): Promise<number> {
  const commands = commandsOverride ?? serializeCommands(family, seed, steps);
  await setupFamily(page, family);
  for (let index = 0; index < commands.length; index++) {
    const command = commands[index]!;
    try {
      await page.evaluate(
        (command) => (window as unknown as CampaignWindow).auditCommandHistory!.push(command),
        command
      );
      await executeCommand(page, family, command);
      await settle(page);
      await check(page);
      if (family === 5) {
        const integrity = await page.evaluate(() => {
          const s = (window as unknown as CampaignWindow).auditSlider;
          const originals = [...s.root.querySelectorAll<HTMLElement>('[data-case-id]')].filter(
            (card) => getComputedStyle(card).display !== 'none'
          );
          const cells = (s.options.grid?.rows ?? 1) * (s.options.grid?.cols ?? 1);
          return {
            total: originals.length,
            identities: new Set(originals.map((card) => card.dataset.caseId)).size,
            pages: s.slideCount,
            expectedPages: Math.ceil(originals.length / cells),
          };
        });
        expect(integrity.identities, 'STATEFUL_GRID_DUPLICATED_ORIGINAL').toBe(integrity.total);
        expect(integrity.pages, 'STATEFUL_GRID_PAGE_CARDINALITY').toBe(integrity.expectedPages);
      }
    } catch (error) {
      throw new Error(
        `STATEFUL_FAILURE family=${family} seed=${seed} step=${index} command=${JSON.stringify(command)} history=${JSON.stringify(commands.slice(0, index + 1))}\n${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  return commands.length;
}

async function installResourceProbe(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as CampaignWindow;
    const add = EventTarget.prototype.addEventListener;
    const remove = EventTarget.prototype.removeEventListener;
    const timeout = window.setTimeout as unknown as (handler: () => void, delay?: number) => number;
    const clear = window.clearTimeout as unknown as (id: number) => void;
    const raf = window.requestAnimationFrame;
    const caf = window.cancelAnimationFrame;
    const Resize = window.ResizeObserver;
    const Intersection = window.IntersectionObserver;
    const listeners: Array<{
      target: EventTarget;
      type: string;
      callback: EventListenerOrEventListenerObject;
      capture: boolean;
      wrapped: EventListener;
    }> = [];
    const timers = new Set<number>();
    const frames = new Set<number>();
    const observers = new Set<object>();
    EventTarget.prototype.addEventListener = function (type, callback, options) {
      if (!callback) return add.call(this, type, callback, options);
      const capture = typeof options === 'boolean' ? options : Boolean(options?.capture);
      if (
        listeners.some(
          (item) =>
            item.target === this &&
            item.type === type &&
            item.callback === callback &&
            item.capture === capture
        )
      )
        return;
      const once = typeof options === 'object' && options?.once;
      const record = {
        target: this,
        type,
        callback,
        capture,
        wrapped: undefined as unknown as EventListener,
      };
      record.wrapped = (event) => {
        if (once) {
          const index = listeners.indexOf(record);
          if (index >= 0) listeners.splice(index, 1);
        }
        if (typeof callback === 'function') callback.call(this, event);
        else callback.handleEvent(event);
      };
      listeners.push(record);
      add.call(this, type, record.wrapped, options);
    };
    EventTarget.prototype.removeEventListener = function (type, callback, options) {
      const capture = typeof options === 'boolean' ? options : Boolean(options?.capture);
      const index = listeners.findIndex(
        (item) =>
          item.target === this &&
          item.type === type &&
          item.callback === callback &&
          item.capture === capture
      );
      if (index >= 0) {
        const record = listeners.splice(index, 1)[0]!;
        remove.call(this, type, record.wrapped, options);
      } else remove.call(this, type, callback, options);
    };
    window.setTimeout = ((handler: TimerHandler, delay?: number, ...args: unknown[]) => {
      let id = 0;
      id = timeout.call(
        window,
        () => {
          timers.delete(id);
          if (typeof handler === 'function') handler(...args);
          else throw new Error('RESOURCE_PROBE_STRING_TIMER_UNSUPPORTED');
        },
        delay
      );
      timers.add(id);
      return id;
    }) as typeof window.setTimeout;
    window.clearTimeout = ((id: number) => {
      timers.delete(id);
      clear.call(window, id);
    }) as typeof window.clearTimeout;
    window.requestAnimationFrame = (callback) => {
      const id = raf.call(window, (time) => {
        frames.delete(id);
        callback(time);
      });
      frames.add(id);
      return id;
    };
    window.cancelAnimationFrame = (id) => {
      frames.delete(id);
      caf.call(window, id);
    };
    window.ResizeObserver = class extends Resize {
      constructor(callback: ResizeObserverCallback) {
        super(callback);
        observers.add(this);
      }
      override observe(target: Element, options?: ResizeObserverOptions): void {
        observers.add(this);
        super.observe(target, options);
      }
      override disconnect(): void {
        observers.delete(this);
        super.disconnect();
      }
    };
    window.IntersectionObserver = class extends Intersection {
      constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
        super(callback, options);
        observers.add(this);
      }
      override observe(target: Element): void {
        observers.add(this);
        super.observe(target);
      }
      override disconnect(): void {
        observers.delete(this);
        super.disconnect();
      }
    };
    w.auditResourceProbe = {
      counts: () => ({
        listeners: listeners.length,
        timers: timers.size,
        frames: frames.size,
        observers: observers.size,
      }),
      restore: () => {
        EventTarget.prototype.addEventListener = add;
        EventTarget.prototype.removeEventListener = remove;
        window.setTimeout = timeout as typeof window.setTimeout;
        window.clearTimeout = clear as typeof window.clearTimeout;
        window.requestAnimationFrame = raf;
        window.cancelAnimationFrame = caf;
        window.ResizeObserver = Resize;
        window.IntersectionObserver = Intersection;
      },
    };
  });
}

/** 100 complete lifecycles, with count simultaneously mounted independent instances in every cycle. */
export async function soakInstances(page: Page, count: number): Promise<number> {
  await installResourceProbe(page);
  const baseline = await page.evaluate(() =>
    (window as unknown as CampaignWindow).auditResourceProbe!.counts()
  );
  const samples: Array<{ cycle: number; mounted: number; resources: ResourceCounts }> = [];
  try {
    for (let cycle = 0; cycle < 100; cycle++) {
      const result = await page.evaluate(
        ({ count, cycle }) => {
          const w = window as unknown as CampaignWindow;
          document.body.replaceChildren();
          const sliders: Tvist[] = [];
          for (let index = 0; index < count; index++) {
            const root = document.createElement('div');
            root.className = 'tvist-v1';
            root.style.cssText = 'width:240px;height:120px';
            root.innerHTML = `<div class="tvist-v1__track" style="height:120px"><div class="tvist-v1__container">${Array.from({ length: 7 }, (_, i) => `<div class="tvist-v1__slide" style="height:120px">${i}</div>`).join('')}</div></div>`;
            document.body.append(root);
            sliders.push(
              new w.TvistV1(root, {
                speed: 0,
                loop: true,
                visibility: false,
                arrows: true,
                pagination: true,
                scrollbar: true,
                wheel: true,
              })
            );
          }
          const mounted = sliders.filter(
            (slider) =>
              (slider.root as HTMLElement & { tvistInstance?: Tvist }).tvistInstance === slider
          ).length;
          for (const slider of sliders) {
            slider.next();
            slider.disable();
            slider.enable();
            slider.prev();
          }
          for (const slider of sliders.reverse()) {
            slider.destroy({ destroyNested: true });
            slider.root.remove();
          }
          return { mounted, cycle };
        },
        { count, cycle }
      );
      await page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
          )
      );
      const resources = await page.evaluate(() =>
        (window as unknown as CampaignWindow).auditResourceProbe!.counts()
      );
      samples.push({ ...result, resources });
      expect(result.mounted, `SOAK_SIMULTANEOUS_COUNT cycle=${cycle}`).toBe(count);
      expect(
        resourceLeakErrors(baseline, resources),
        `SOAK_RESOURCES cycle=${cycle} count=${count}`
      ).toEqual([]);
      expect(await page.locator('.tvist-v1').count(), `SOAK_RETAINED_ROOT cycle=${cycle}`).toBe(0);
    }
    return 100 * count;
  } finally {
    await page.evaluate((samples) => {
      const w = window as unknown as CampaignWindow;
      w.auditCampaignMetrics = { type: 'soak-instances', samples };
      w.auditResourceProbe?.restore();
    }, samples);
  }
}

async function movingGeometry(page: Page): Promise<void> {
  const measurement = await page.evaluate(() => {
    const s = (window as unknown as CampaignWindow).auditSlider;
    const rect = (node: Element) => {
      const r = node.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
    };
    return {
      track: rect(s.track),
      cards: s.slides.map(rect),
      transform: getComputedStyle(s.container).transform,
    };
  });
  expect(measurement.transform, 'SOAK_NONFINITE_TRANSFORM').not.toMatch(/NaN|Infinity/);
  expect(coverageHoles(measurement.track, measurement.cards), 'SOAK_VIEWPORT_HOLE').toEqual([]);
}

/** Actual continuous activity, with DOM invariants checked throughout rather than only at the end. */
export async function soakMotion(page: Page, mode: string, durationMs: number): Promise<number> {
  if (!['autoplay', 'marquee', 'resize', 'drag'].includes(mode))
    throw new Error('SOAK_UNKNOWN_MODE');
  await mount(
    page,
    {
      loop: true,
      speed: 80,
      ...(mode === 'autoplay'
        ? {
            autoplay: {
              delay: 120,
              pauseOnHover: false,
              pauseOnFocus: false,
              pauseOnInteraction: false,
            },
          }
        : {}),
      ...(mode === 'marquee' ? { marquee: { speed: 90, pauseOnHover: false } } : {}),
    },
    { count: 17 }
  );
  const start = Date.now();
  const end = start + durationMs;
  let cycles = 0;
  let previous: number | undefined;
  let observedMovement = 0;
  const samples: Array<{ elapsed: number; position: number; index: number }> = [];
  try {
    while (Date.now() < end) {
      if (mode === 'drag')
        await realDrag(page, '#audit-slider > .tvist-v1__track', cycles % 2 ? 350 : -350);
      else if (mode === 'resize') {
        await page.evaluate((cycle) => {
          const s = (window as unknown as CampaignWindow).auditSlider;
          s.root.style.width = `${[420, 720, 900, 600][cycle % 4]}px`;
          s.update();
          s.next();
        }, cycles);
      }
      await page.waitForTimeout(100);
      await movingGeometry(page);
      const sample = await page.evaluate(() => {
        const s = (window as unknown as CampaignWindow).auditSlider;
        return {
          position: new DOMMatrixReadOnly(getComputedStyle(s.container).transform).m41,
          index: s.realIndex,
        };
      });
      if (previous !== undefined && Math.abs(sample.position - previous) > 0.5) observedMovement++;
      previous = sample.position;
      samples.push({ elapsed: Date.now() - start, ...sample });
      cycles++;
    }
    if (durationMs >= 1000)
      expect(observedMovement, 'SOAK_ACTIVITY_DID_NOT_MOVE').toBeGreaterThan(0);
    return cycles;
  } finally {
    await page.evaluate(
      (metrics) => {
        const w = window as unknown as CampaignWindow;
        w.auditSlider.autoplay?.stop();
        w.auditSlider.marquee?.stop();
        w.auditCampaignMetrics = metrics;
      },
      {
        type: 'soak-motion',
        mode,
        requestedDuration: durationMs,
        elapsed: Date.now() - start,
        cycles,
        observedMovement,
        samples,
      }
    );
  }
}

/** Measures lifecycle calls and five real transitions for each subscription path; budgets are diagnostic. */
export async function performanceCase(page: Page, count: number, instances = 1): Promise<unknown> {
  await mount(page, { perPage: 3, speed: 180, visibility: false, loop: false }, { count });
  const init = await page.evaluate((instances) => {
    const w = window as unknown as CampaignWindow;
    const root = w.auditSlider.root;
    w.auditSlider.destroy();
    const roots = [root];
    for (let i = 1; i < instances; i++) {
      const clone = root.cloneNode(true) as HTMLElement;
      clone.id = 'perf-peer-' + i;
      document.body.append(clone);
      roots.push(clone);
    }
    const start = performance.now();
    const sliders = roots.map(
      (element) => new w.TvistV1(element, { perPage: 3, speed: 180, visibility: false })
    );
    w.auditSlider = sliders[0]!;
    const peers = sliders.slice(1);
    (window as unknown as { auditPeers: Tvist[] }).auditPeers = peers;
    return performance.now() - start;
  }, instances);
  await settle(page);
  const phases: unknown[] = [];
  for (const subscribed of [false, true]) {
    const result = await page.evaluate(async (subscribed) => {
      const s = (window as unknown as CampaignWindow).auditSlider;
      s.scrollTo(0, true);
      let scrollEvents = 0;
      let styleWrites = 0;
      let domWrites = 0;
      let running = true;
      let frameId = 0;
      let previousTime = performance.now();
      const frames: number[] = [];
      const positions: number[] = [];
      const longTasks: number[] = [];
      const onScroll = () => {
        scrollEvents++;
      };
      if (subscribed) s.on('scroll', onScroll);
      const observer = new MutationObserver((records) => {
        styleWrites += records.filter(
          (record) => record.type === 'attributes' && record.attributeName === 'style'
        ).length;
        domWrites += records.filter(
          (record) =>
            record.type === 'childList' ||
            (record.type === 'attributes' && record.attributeName !== 'style')
        ).length;
      });
      observer.observe(s.root, { attributes: true, childList: true, subtree: true });
      const performanceObserver =
        typeof PerformanceObserver !== 'undefined' &&
        PerformanceObserver.supportedEntryTypes.includes('longtask')
          ? new PerformanceObserver((list) =>
              longTasks.push(...list.getEntries().map((entry) => entry.duration))
            )
          : null;
      performanceObserver?.observe({ type: 'longtask' });
      const frame = (time: number) => {
        if (!running) return;
        frames.push(time - previousTime);
        previousTime = time;
        positions.push(new DOMMatrixReadOnly(getComputedStyle(s.container).transform).m41);
        frameId = requestAnimationFrame(frame);
      };
      frameId = requestAnimationFrame(frame);
      for (let index = 1; index <= 5; index++) {
        s.scrollTo(index);
        for (const peer of (window as unknown as { auditPeers: Tvist[] }).auditPeers ?? [])
          peer.scrollTo(index);
        await new Promise((resolve) => setTimeout(resolve, 230));
      }
      running = false;
      cancelAnimationFrame(frameId);
      observer.disconnect();
      performanceObserver?.disconnect();
      s.off('scroll', onScroll);
      const eventsAtOff = scrollEvents;
      const finalIndex = s.realIndex;
      s.scrollTo(0, true);
      const sorted = frames.slice().sort((a, b) => a - b);
      const percentile = (p: number) =>
        sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] ?? 0;
      return {
        subscribed,
        frames,
        positions,
        scrollEvents,
        eventsAtOff,
        finalIndex,
        styleWrites,
        domWrites,
        longTasks,
        longTaskSupported: performanceObserver !== null,
        movedFrames: positions.filter(
          (position, index) => index > 0 && Math.abs(position - positions[index - 1]!) > 0.5
        ).length,
        p50FrameMs: percentile(0.5),
        p95FrameMs: percentile(0.95),
        framesOver34ms: frames.filter((value) => value > 34).length,
      };
    }, subscribed);
    expect(result.movedFrames, 'PERFORMANCE_MEASURED_IDLE_PAGE').toBeGreaterThan(5);
    expect(result.finalIndex, 'PERFORMANCE_TRANSITIONS_DID_NOT_COMPLETE').toBe(5);
    expect(result.scrollEvents, 'PERFORMANCE_LISTENER_SURVIVED_OFF').toBe(result.eventsAtOff);
    if (subscribed)
      expect(result.scrollEvents, 'PERFORMANCE_SUBSCRIBED_PATH_NOT_EXERCISED').toBeGreaterThan(0);
    else expect(result.scrollEvents).toBe(0);
    phases.push(result);
  }
  const lifecycle = await page.evaluate(() => {
    const all = [
      (window as unknown as CampaignWindow).auditSlider,
      ...(window as unknown as { auditPeers: Tvist[] }).auditPeers,
    ];
    let start = performance.now();
    all.forEach((slider) => slider.update());
    const updateMs = performance.now() - start;
    start = performance.now();
    all.forEach((slider) => slider.destroy());
    return { updateMs, destroyMs: performance.now() - start, timedInstanceCount: all.length };
  });
  const result = {
    count,
    instances,
    constructorMs: init,
    ...lifecycle,
    phases,
    instrumentation:
      'Constructor/update/destroy are synchronous bulk-call timings for timedInstanceCount after fixture warmup; root cloning precedes constructor timing. RAF/computed-style and root MutationObserver samples affect frame timing. Style/DOM writes cover the primary root only. No universal FPS gate is inferred.',
  };
  await page.evaluate((result) => {
    (window as unknown as CampaignWindow).auditCampaignMetrics = result;
  }, result);
  return result;
}
