import { expect, test, type Frame, type Page } from '@playwright/test';
import { resolve } from 'node:path';
import { readFileSync, readdirSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { standalonePage } from '../docs/site/standalone';
import type { Tvist } from '../src/core/Tvist';
import type { TvistOptions } from '../src/core/types';

const bundlePath = (file: string): string => resolve(process.cwd(), 'browser-build', file);

async function isolatedFrame(page: Page, stylesheet = 'tvist.css'): Promise<Frame> {
  // Изолируем глобаль UMD внутри существующей страницы E2E.
  await page.goto('/');
  await page.evaluate(() => {
    const iframe = document.createElement('iframe');
    iframe.name = 'browser-bundle-test';
    iframe.style.width = '720px';
    iframe.style.height = '360px';
    document.body.appendChild(iframe);
  });
  const frame = page.frame({ name: 'browser-bundle-test' });
  if (!frame) throw new Error('Browser bundle test frame was not created');
  await page.locator('iframe[name="browser-bundle-test"]').scrollIntoViewIfNeeded();
  await frame.addStyleTag({ path: bundlePath(stylesheet) });
  return frame;
}

async function createSlider(frame: Frame, options: TvistOptions = {}) {
  return frame.evaluate((sliderOptions) => {
    document.body.innerHTML = `
      <div id="browser-slider" class="tvist-v1" style="width:600px">
        <div class="tvist-v1__track">
          <div class="tvist-v1__container">
            <div class="tvist-v1__slide" style="height:200px">1</div>
            <div class="tvist-v1__slide" style="height:200px">2</div>
            <div class="tvist-v1__slide" style="height:200px">3</div>
          </div>
        </div>
        <button class="tvist-v1__arrow tvist-v1__arrow--prev" type="button"></button>
        <button class="tvist-v1__arrow tvist-v1__arrow--next" type="button"></button>
        <div class="tvist-v1__pagination"></div>
      </div>`;
    const BrowserTvist = (window as typeof window & { TvistV1: typeof Tvist }).TvistV1;
    const slider = new BrowserTvist('#browser-slider', sliderOptions);
    return {
      privateAPI: 'engine' in slider || 'getModule' in slider || 'registerModule' in BrowserTvist,
      drag: Boolean(slider.root.classList.contains('tvist-v1--draggable')),
      breakpoints: Boolean(slider.options.breakpoints),
      pagination: Boolean(document.querySelector('.tvist-v1__bullet')),
      navigation: Boolean(document.querySelector('.tvist-v1__arrow')),
      effect: Boolean(slider.options.effect && slider.options.effect !== 'slide'),
      autoplay: Boolean(slider.autoplay),
      loop: Boolean(slider.options.loop),
      visibility: Boolean(slider.visibility),
      slides: slider.slides.length,
      bullets: document.querySelectorAll('.tvist-v1__bullet').length,
      activeSlides: document.querySelectorAll('.tvist-v1__slide--active').length,
    };
  }, options);
}

const buildFiles = ['tvist.css', 'tvist.min.js'];

test('ships one complete JS/CSS pair and gzip copy within the byte budget', () => {
  expect(
    readdirSync(bundlePath(''))
      .filter((file) => !file.startsWith('.'))
      .sort()
  ).toEqual([...buildFiles, 'tvist.min.js.gz'].sort());
  const code = readFileSync(bundlePath('tvist.min.js'));
  expect(code.length).toBeLessThanOrEqual(100_000);
  expect(code.toString()).toMatch(/^\/\*! Tvist v/);
  expect(gunzipSync(readFileSync(bundlePath('tvist.min.js.gz'))).equals(code)).toBe(true);
  const css = readFileSync(bundlePath('tvist.css'), 'utf8');
  expect(css.match(/:root\{/g)).toHaveLength(1);
  for (const selector of [
    '.tvist-v1{',
    '.tvist-v1__arrow{',
    '.tvist-v1__pagination{',
    '.tvist-v1--cube',
    '.tvist-v1--nav',
    '.tvist-v1__grid-col',
    '.tvist-v1__scrollbar',
    '.tvist-v1__spinner',
  ])
    expect(css).toContain(selector);
});

test('minified pagination preserves fractional totals with grouped navigation', async ({ page }) => {
  const frame = await isolatedFrame(page);
  await frame.addScriptTag({ path: bundlePath('tvist.min.js') });
  await createSlider(frame, {
    perPage: 1.5,
    slidesPerGroup: 2,
    speed: 0,
    pagination: { type: 'fraction' },
  });
  await expect(frame.locator('.tvist-v1__pagination-total')).toHaveText('2.5');
  const result = await frame.evaluate(() => {
    const root = document.getElementById('browser-slider') as HTMLElement & { tvistInstance: Tvist };
    const slider = root.tvistInstance;
    slider.scrollTo(1, true);
    const current = document.querySelector('.tvist-v1__pagination-current')?.textContent;
    slider.updateOptions({ perPage: 2 });
    slider.scrollTo(0, true);
    return {
      current,
      total: document.querySelector('.tvist-v1__pagination-total')?.textContent,
    };
  });
  expect(result).toEqual({ current: '2', total: '2' });
});

test('full browser pair includes all modules, navigation and Cube/Scrollbar styles', async ({
  page,
}) => {
  const frame = await isolatedFrame(page, 'tvist.css');
  await frame.addScriptTag({ path: bundlePath('tvist.min.js') });
  const result = await createSlider(frame, {
    effect: 'cube',
    arrows: true,
    pagination: true,
    scrollbar: true,
    speed: 0,
  });
  expect(result.privateAPI).toBe(false);
  expect(result).toMatchObject({
    navigation: true,
    pagination: true,
    effect: true,
    visibility: true,
    bullets: 3,
  });
  await expect(frame.locator('#browser-slider')).toHaveClass(/tvist-v1--cube/);
  await expect(frame.locator('.tvist-v1__slide').first()).toHaveCSS('position', 'absolute');
  await expect(frame.locator('.tvist-v1__scrollbar')).toHaveCSS('position', 'absolute');
  await expect(frame.locator('.tvist-v1__scrollbar-thumb')).toHaveCSS('cursor', 'grab');
  await frame.locator('.tvist-v1__arrow--next').click();
  await expect(frame.locator('.tvist-v1__bullet--active')).toHaveAttribute('data-index', '1');
});

test('full bundle covers navigation, pagination, loop, autoplay and visibility', async ({
  page,
}) => {
  const frame = await isolatedFrame(page);
  await frame.addScriptTag({ path: bundlePath('tvist.min.js') });
  const result = await createSlider(frame, {
    arrows: true,
    pagination: true,
    loop: true,
    speed: 0,
    autoplay: { delay: 100, pauseOnHover: false },
  });
  expect(result.privateAPI).toBe(false);
  expect(result).toMatchObject({
    navigation: true,
    pagination: true,
    autoplay: true,
    loop: true,
    visibility: true,
    bullets: 3,
    activeSlides: 1,
    effect: false,
  });
  await frame.waitForFunction(() => {
    const slider = document.querySelector<HTMLElement & { tvistInstance?: Tvist }>(
      '#browser-slider'
    )!.tvistInstance!;
    return slider.realIndex !== 0;
  });
  await frame.locator('#browser-slider').evaluate((root) => {
    root.style.display = 'none';
  });
  await frame.waitForFunction(() => {
    const slider = document.querySelector<HTMLElement & { tvistInstance?: Tvist }>(
      '#browser-slider'
    )!.tvistInstance!;
    return !slider.visibility?.isVisible() && slider.autoplay!.isPaused();
  });
  await frame.locator('#browser-slider').evaluate((root) => {
    root.style.display = '';
  });
  await frame.waitForFunction(() => {
    const slider = document.querySelector<HTMLElement & { tvistInstance?: Tvist }>(
      '#browser-slider'
    )!.tvistInstance!;
    return slider.visibility?.isVisible() && !slider.autoplay!.isPaused();
  });
  expect(
    await frame.evaluate(() => {
      const slider = document.querySelector<HTMLElement & { tvistInstance?: Tvist }>(
        '#browser-slider'
      )!.tvistInstance!;
      slider.updateOptions({ autoplay: false });
      return Boolean(slider.autoplay);
    })
  ).toBe(false);
  expect(
    await frame.evaluate(() => {
      const slider = document.querySelector<HTMLElement & { tvistInstance?: Tvist }>(
        '#browser-slider'
      )!.tvistInstance!;
      slider.updateOptions({ autoplay: { delay: 5000 } });
      return Boolean(slider.autoplay);
    })
  ).toBe(true);
});

test('full bundle updates options when the browser crosses a breakpoint', async ({ page }) => {
  const frame = await isolatedFrame(page);
  await frame.addScriptTag({ path: bundlePath('tvist.min.js') });
  await createSlider(frame, {
    perPage: 2,
    pagination: false,
    breakpoints: { 400: { perPage: 1, pagination: true } },
  });
  await page.locator('iframe[name="browser-bundle-test"]').evaluate((iframe) => {
    iframe.style.width = '350px';
  });
  await frame.waitForFunction(() => {
    const slider = document.querySelector<HTMLElement & { tvistInstance?: Tvist }>(
      '#browser-slider'
    )!.tvistInstance!;
    return slider.options.perPage === 1 && Boolean(slider.root.querySelector('.tvist-v1__bullet'));
  });
  await page.locator('iframe[name="browser-bundle-test"]').evaluate((iframe) => {
    iframe.style.width = '720px';
  });
  await frame.waitForFunction(() => {
    const slider = document.querySelector<HTMLElement & { tvistInstance?: Tvist }>(
      '#browser-slider'
    )!.tvistInstance!;
    return slider.options.perPage === 2 && !slider.root.querySelector('.tvist-v1__bullet');
  });
});

for (const scenario of ['cube', 'grid', 'scrollbar'] as const) {
  test(`full bundle provides ${scenario} behavior and its CSS`, async ({ page }) => {
    const frame = await isolatedFrame(page);
    await frame.addScriptTag({ path: bundlePath('tvist.min.js') });
    await createSlider(
      frame,
      scenario === 'cube'
        ? { effect: 'cube' }
        : scenario === 'grid'
          ? { grid: { rows: 2, cols: 1 } }
          : { scrollbar: true }
    );
    if (scenario === 'cube') {
      await expect(frame.locator('#browser-slider')).toHaveClass(/tvist-v1--cube/);
      await expect(frame.locator('.tvist-v1__slide').first()).toHaveCSS('position', 'absolute');
      await expect(frame.locator('.tvist-v1__track')).toHaveCSS('overflow', 'visible');
    } else if (scenario === 'grid') {
      await expect(frame.locator('.tvist-v1__slide--grid-page')).toHaveCount(2);
      await expect(frame.locator('.tvist-v1__grid-col').first()).toHaveCSS('overflow', 'hidden');
    } else {
      await expect(frame.locator('.tvist-v1__scrollbar')).toHaveCSS('position', 'absolute');
      await expect(frame.locator('.tvist-v1__scrollbar-thumb')).toHaveCSS('cursor', 'grab');
    }
  });
}

for (const failedFile of [null, 'tvist.css', 'tvist.min.js']) {
  test(`standalone export loads all assets and starts once (${failedFile ?? 'tagged version'})`, async ({
    page,
  }) => {
    const requests: string[] = [];
    await page.route(
      'https://cdn.jsdelivr.net/gh/VladimirIvanin/tvist@**/browser-build/*',
      async (route) => {
        const url = route.request().url();
        requests.push(url);
        const file = url.slice(url.lastIndexOf('/') + 1);
        if (failedFile && !url.includes('@main/') && file === failedFile) {
          await route.abort();
        } else {
          await route.fulfill({
            body: readFileSync(bundlePath(file)),
            contentType: file.endsWith('.css') ? 'text/css' : 'text/javascript',
          });
        }
      }
    );
    const frame = await isolatedFrame(page);
    await frame.setContent(
      standalonePage({
        html: '<div class="tvist-v1" id="export-slider"><div class="tvist-v1__track"><div class="tvist-v1__container"><div class="tvist-v1__slide">1</div><div class="tvist-v1__slide">2</div></div></div></div>',
        css: '.tvist-v1 { width: 600px; } .tvist-v1__slide { height: 200px; }',
        js: "window.exampleStarts = (window.exampleStarts || 0) + 1; new TvistV1('#export-slider', { effect: 'cube' });",
      })
    );
    await expect(frame.locator('#export-slider')).toHaveClass(/tvist-v1--created/);
    const result = await frame.evaluate(() => {
      const browser = window as unknown as { exampleStarts: number; TvistV1: typeof Tvist };
      return {
        starts: browser.exampleStarts,
        privateAPI: 'registerModule' in browser.TvistV1,
        assets: Array.from(
          document.querySelectorAll<HTMLLinkElement | HTMLScriptElement>('link, script[src]')
        ).map((el) => (el instanceof HTMLLinkElement ? el.href : el.src)),
      };
    });
    expect(result.starts).toBe(1);
    expect(result.privateAPI).toBe(false);
    expect(result.assets.map((url) => url.slice(url.lastIndexOf('/') + 1)).sort()).toEqual(
      buildFiles
    );
    expect(
      result.assets.every((url) => (failedFile ? url.includes('@main/') : !url.includes('@main/')))
    ).toBe(true);
    await expect(frame.locator('.tvist-v1__slide').first()).toHaveCSS('position', 'absolute');
    if (failedFile) expect(requests.filter((url) => url.includes('@main/'))).toHaveLength(2);
  });
}

for (const direction of ['prev', 'next'] as const) {
  test(`full browser bundle keeps loop moving during rapid ${direction} clicks`, async ({
    page,
  }) => {
    const frame = await isolatedFrame(page);
    await page.locator('iframe[name="browser-bundle-test"]').evaluate((iframe) => {
      iframe.style.width = '720px';
      iframe.style.height = '320px';
    });
    await page.locator('iframe[name="browser-bundle-test"]').scrollIntoViewIfNeeded();
    await frame.addScriptTag({ path: bundlePath('tvist.min.js') });
    await createSlider(frame, {
      perPage: 1,
      loop: true,
      speed: 1200,
      autoplay: { delay: 2600, pauseOnHover: true },
      arrows: true,
      pagination: true,
    });
    await frame.locator('#browser-slider').scrollIntoViewIfNeeded();
    await frame.evaluate(
      () =>
        new Promise((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(resolve));
        })
    );
    await frame.waitForFunction(() => {
      const root = document.querySelector<HTMLElement & { tvistInstance?: Tvist }>(
        '#browser-slider'
      );
      return root?.tvistInstance?.visibility?.isVisible();
    });

    const arrow = frame.locator(`.tvist-v1__arrow--${direction}`);
    await arrow.click();
    await page.waitForTimeout(60);
    await arrow.locator('svg').hover();
    await page.mouse.down();
    const pressed = await frame.evaluate(() => {
      const root = document.querySelector<HTMLElement & { tvistInstance?: Tvist }>(
        '#browser-slider'
      )!;
      const slider = root.tvistInstance!;
      return {
        animating: Boolean(slider.container.style.transition),
        position: new DOMMatrixReadOnly(getComputedStyle(slider.container).transform).m41,
      };
    });
    await page.waitForTimeout(200);
    const held = await frame.evaluate(() => {
      const root = document.querySelector<HTMLElement & { tvistInstance?: Tvist }>(
        '#browser-slider'
      )!;
      const slider = root.tvistInstance!;
      return {
        animating: Boolean(slider.container.style.transition),
        position: new DOMMatrixReadOnly(getComputedStyle(slider.container).transform).m41,
      };
    });
    await page.mouse.up();
    expect(pressed.animating).toBe(true);
    expect(held.animating).toBe(true);
    expect(Math.abs(held.position - pressed.position)).toBeGreaterThan(1);
    await frame.waitForFunction(() => {
      const root = document.querySelector<HTMLElement & { tvistInstance?: Tvist }>(
        '#browser-slider'
      )!;
      return !Boolean(root.tvistInstance!.container.style.transition);
    });
    await frame.evaluate(() => {
      const root = document.querySelector<HTMLElement & { tvistInstance?: Tvist }>(
        '#browser-slider'
      )!;
      root.tvistInstance!.updateOptions({ speed: 300 });
    });

    const result = await frame.evaluate(async (direction) => {
      const root = document.querySelector<HTMLElement & { tvistInstance?: Tvist }>(
        '#browser-slider'
      )!;
      const slider = root.tvistInstance!;
      root.dispatchEvent(new MouseEvent('mouseenter'));
      const button = root.querySelector<HTMLButtonElement>(`.tvist-v1__arrow--${direction}`)!;
      let completed = 0;
      let uncovered = 0;
      slider.on('transitionEnd', () => {
        completed += 1;
      });

      for (let i = 0; i < 60; i += 1) {
        button.click();
        const track = slider.track.getBoundingClientRect();
        const bounds = slider.slides.map((slide) => slide.getBoundingClientRect());
        if (
          Math.min(...bounds.map((rect) => rect.left)) > track.left + 1 ||
          Math.max(...bounds.map((rect) => rect.right)) < track.right - 1
        )
          uncovered += 1;
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      const completedDuringClicks = completed;
      await new Promise((resolve) => setTimeout(resolve, 400));
      return {
        completedDuringClicks,
        uncovered,
        settled: !Boolean(slider.container.style.transition),
        rendered: new DOMMatrixReadOnly(getComputedStyle(slider.container).transform).m41,
        target: -slider.slides[slider.activeIndex]!.offsetLeft,
      };
    }, direction);

    expect(result.completedDuringClicks, JSON.stringify(result)).toBeGreaterThan(0);
    expect(result.uncovered).toBe(0);
    expect(result.settled).toBe(true);
    expect(result.rendered).toBeCloseTo(result.target, 0);
  });
}

test('minified bundle preserves callbacks, late subscriptions and public component controls', async ({
  page,
}) => {
  const frame = await isolatedFrame(page);
  await frame.addScriptTag({ path: bundlePath('tvist.min.js') });
  await createSlider(frame, { visibility: false, speed: 0 });
  const result = await frame.evaluate(() => {
    const BrowserTvist = (window as typeof window & { TvistV1: typeof Tvist }).TvistV1;
    const root = document.querySelector<HTMLElement & { tvistInstance?: Tvist }>(
      '#browser-slider'
    )!;
    root.tvistInstance!.destroy();
    let created: Tvist | undefined;
    let translated: Tvist | undefined;
    const slider = new BrowserTvist(root, {
      speed: 0,
      visibility: false,
      on: {
        created: (instance) => {
          created = instance;
        },
        setTranslate: (instance) => {
          translated = instance;
        },
      },
    });
    let late: Tvist | undefined;
    slider.on('created', (instance) => {
      late = instance;
    });
    let changes = 0;
    slider.on('slideChangeStart', (index) => {
      if (index === 1) changes++;
    });
    const fluent = slider.next() === slider && slider.update() === slider;
    let once = 0;
    slider.once('custom', (...args) => {
      if (args[0] === 3 && args[1] === 'payload') once++;
    });
    slider.emit('custom', 3, 'payload').emit('custom', 3, 'payload');
    const identity = created === slider && late === slider && translated === slider;
    const disabledAPIs = [
      slider.autoplay,
      slider.video,
      slider.marquee,
      slider.lazyload,
      slider.visibility,
    ].every((value) => value === undefined);
    slider.updateOptions({ breakpoints: { 10000: { perPage: 1 } } });
    const breakpoint = slider.currentBreakpoint;
    slider.updateOptions({ breakpoints: {} });
    const noBreakpoint = slider.currentBreakpoint;
    slider.updateOptions({ marquee: { speed: 20 }, visibility: true });
    slider.marquee!.setSpeed(45);
    slider.marquee!.setDirection('right');
    slider.marquee!.pause();
    const marquee = {
      speed: slider.marquee!.getSpeed(),
      direction: slider.marquee!.getDirection(),
      paused: slider.marquee!.isPaused(),
    };
    slider.marquee!.resume();
    slider.marquee!.stop();
    slider.marquee!.start();
    slider.visibility!.check();
    const visible = slider.visibility!.isVisible();
    slider.updateOptions({ marquee: false, lazy: true });
    const image = document.createElement('img');
    image.dataset.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
    slider.slides[2]!.appendChild(image);
    slider.update();
    slider.lazyload!.loadSlide(2);
    slider.lazyload!.loadAll();
    const loaded = image.src.startsWith('data:image/gif');
    slider.disable();
    const disabled =
      slider.marquee === undefined &&
      slider.lazyload === undefined &&
      slider.visibility === undefined;
    slider.enable();
    const enabled = Boolean(slider.lazyload && slider.visibility);
    slider.destroy().destroy();
    return {
      identity,
      fluent,
      changes,
      once,
      disabledAPIs,
      breakpoint,
      noBreakpoint,
      marquee,
      visible,
      loaded,
      disabled,
      enabled,
      cleaned: root.tvistInstance === null,
    };
  });
  expect(result).toEqual({
    identity: true,
    fluent: true,
    changes: 1,
    once: 1,
    disabledAPIs: true,
    breakpoint: 10000,
    noBreakpoint: null,
    marquee: { speed: 45, direction: 'right', paused: true },
    visible: true,
    loaded: true,
    disabled: true,
    enabled: true,
    cleaned: true,
  });
});

test('minified video and autoplay preserve HTML media properties and event payloads', async ({
  page,
}) => {
  const frame = await isolatedFrame(page);
  await frame.addScriptTag({ path: bundlePath('tvist.min.js') });
  await createSlider(frame, { visibility: false, speed: 0 });
  const result = await frame.evaluate(async () => {
    const root = document.querySelector<HTMLElement & { tvistInstance?: Tvist }>(
      '#browser-slider'
    )!;
    const slider = root.tvistInstance!;
    const video = document.createElement('video');
    slider.slides[0]!.appendChild(video);
    let paused = true;
    Object.defineProperties(video, {
      paused: { get: () => paused },
      duration: { value: 10 },
      readyState: { value: 4 },
    });
    video.play = () => {
      paused = false;
      video.dispatchEvent(new Event('play'));
      return Promise.resolve();
    };
    video.pause = () => {
      paused = true;
      video.dispatchEvent(new Event('pause'));
    };
    const events: { name: string; valid: boolean }[] = [];
    for (const name of ['videoPlay', 'videoPause', 'videoEnded'])
      slider.on(name, (payload) => {
        events.push({
          name,
          valid:
            payload.video === video && payload.slide === slider.slides[0] && payload.index === 0,
        });
      });
    slider.updateOptions({
      video: { autoplay: false },
      autoplay: { delay: 5000, pauseOnHover: true, waitForVideo: true },
    });
    slider.video!.play();
    await Promise.resolve();
    const playing = !video.paused;
    slider.video!.pause();
    slider.video!.unmute();
    const unmuted = !video.muted && !slider.video!.isMuted();
    slider.video!.mute();
    const muted = video.muted && slider.video!.isMuted();
    video.dispatchEvent(new Event('ended'));
    const payloads =
      events.every((event) => event.valid) &&
      ['videoPlay', 'videoPause', 'videoEnded'].every((name) =>
        events.some((event) => event.name === name)
      );
    slider.destroy();
    const count = events.length;
    video.dispatchEvent(new Event('play'));
    const cleanup = count === events.length && root.tvistInstance === null;
    return { playing, unmuted, muted, payloads, cleanup };
  });
  expect(result).toEqual({
    playing: true,
    unmuted: true,
    muted: true,
    payloads: true,
    cleanup: true,
  });
});

test('minified bundle releases DOM listeners, observers, timers and RAF across many instances', async ({
  page,
}) => {
  const frame = await isolatedFrame(page);
  await frame.addScriptTag({ path: bundlePath('tvist.min.js') });
  const result = await frame.evaluate(() => {
    const BrowserTvist = (window as typeof window & { TvistV1: typeof Tvist }).TvistV1;
    const listeners: {
      target: EventTarget;
      type: string;
      handler: EventListenerOrEventListenerObject;
      capture: boolean;
    }[] = [];
    const timers = new Set<number>();
    const frames = new Set<number>();
    const add = EventTarget.prototype.addEventListener;
    const remove = EventTarget.prototype.removeEventListener;
    const timeout = window.setTimeout.bind(window);
    const clearTimeout = window.clearTimeout.bind(window);
    const requestFrame = window.requestAnimationFrame.bind(window);
    const cancelFrame = window.cancelAnimationFrame.bind(window);
    EventTarget.prototype.addEventListener = function (type, handler, options) {
      if (handler) {
        const capture = typeof options === 'boolean' ? options : (options?.capture ?? false);
        if (
          !listeners.some(
            (entry) =>
              entry.target === this &&
              entry.type === type &&
              entry.handler === handler &&
              entry.capture === capture
          )
        )
          listeners.push({ target: this, type, handler, capture });
      }
      return add.call(this, type, handler, options);
    };
    EventTarget.prototype.removeEventListener = function (type, handler, options) {
      const capture = typeof options === 'boolean' ? options : (options?.capture ?? false);
      const index = listeners.findIndex(
        (entry) =>
          entry.target === this &&
          entry.type === type &&
          entry.handler === handler &&
          entry.capture === capture
      );
      if (index >= 0) listeners.splice(index, 1);
      return remove.call(this, type, handler, options);
    };
    window.setTimeout = ((callback: () => void, delay?: number) => {
      const id = timeout(() => {
        timers.delete(id);
        callback();
      }, delay);
      timers.add(id);
      return id;
    }) as typeof window.setTimeout;
    window.clearTimeout = (id) => {
      timers.delete(id);
      clearTimeout(id);
    };
    window.requestAnimationFrame = (callback) => {
      const id = requestFrame((time) => {
        frames.delete(id);
        callback(time);
      });
      frames.add(id);
      return id;
    };
    window.cancelAnimationFrame = (id) => {
      frames.delete(id);
      cancelFrame(id);
    };
    const observers = new Set<object>();
    const NativeResizeObserver = window.ResizeObserver;
    const NativeMutationObserver = window.MutationObserver;
    const NativeIntersectionObserver = window.IntersectionObserver;
    window.ResizeObserver = class extends NativeResizeObserver {
      override observe(...args: Parameters<ResizeObserver['observe']>) {
        observers.add(this);
        return super.observe(...args);
      }
      override disconnect() {
        observers.delete(this);
        super.disconnect();
      }
    };
    window.MutationObserver = class extends NativeMutationObserver {
      override observe(...args: Parameters<MutationObserver['observe']>) {
        observers.add(this);
        return super.observe(...args);
      }
      override disconnect() {
        observers.delete(this);
        super.disconnect();
      }
    };
    window.IntersectionObserver = class extends NativeIntersectionObserver {
      override observe(target: Element) {
        observers.add(this);
        return super.observe(target);
      }
      override disconnect() {
        observers.delete(this);
        super.disconnect();
      }
    };
    try {
      document.body.innerHTML = Array.from(
        { length: 12 },
        () =>
          `<div class="tvist-v1" style="width:600px"><div class="tvist-v1__track"><div class="tvist-v1__container">${'<div class="tvist-v1__slide" style="height:80px">slide</div>'.repeat(12)}</div></div></div>`
      ).join('');
      const sliders = Array.from(
        document.querySelectorAll<HTMLElement>('.tvist-v1'),
        (root, index) =>
          new BrowserTvist(root, {
            loop: index % 2 ? { withClones: true } : true,
            perPage: 2,
            arrows: true,
            pagination: true,
            scrollbar: true,
            autoplay: index % 3 ? { delay: 1000 } : false,
            marquee: index % 3 ? false : { speed: 30 },
            drag: index % 2 ? 'free' : true,
          })
      );
      for (const slider of sliders) {
        slider.next();
        slider.updateOptions({ pagination: false, scrollbar: false, visibility: false });
        slider.disable().enable();
        slider.updateOptions({ pagination: true, scrollbar: true, visibility: true });
        slider.destroy().destroy();
      }
      return {
        listeners: listeners.length,
        timers: timers.size,
        frames: frames.size,
        observers: observers.size,
        detached: sliders.every(
          (slider) => !(slider.root as HTMLElement & { tvistInstance?: Tvist }).tvistInstance
        ),
      };
    } finally {
      EventTarget.prototype.addEventListener = add;
      EventTarget.prototype.removeEventListener = remove;
      window.setTimeout = timeout;
      window.clearTimeout = clearTimeout;
      window.requestAnimationFrame = requestFrame;
      window.cancelAnimationFrame = cancelFrame;
      window.ResizeObserver = NativeResizeObserver;
      window.MutationObserver = NativeMutationObserver;
      window.IntersectionObserver = NativeIntersectionObserver;
    }
  });
  expect(result).toEqual({ listeners: 0, timers: 0, frames: 0, observers: 0, detached: true });
});

for (const effect of ['fade', 'cube'] as const) {
  test(`minified ${effect} effect completes RAF animation and emits transition events`, async ({
    page,
  }) => {
    const frame = await isolatedFrame(page);
    await frame.addScriptTag({ path: bundlePath('tvist.min.js') });
    await createSlider(frame, { effect, speed: 120, visibility: false });
    const result = await frame.evaluate(async () => {
      const slider = document.querySelector<HTMLElement & { tvistInstance?: Tvist }>(
        '#browser-slider'
      )!.tvistInstance!;
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      let starts = 0;
      let frames = 0;
      slider.on('transitionStart', () => {
        starts++;
      });
      slider.on('scroll', () => {
        frames++;
      });
      const finished = new Promise<void>((resolve) => slider.once('slideChangeEnd', resolve));
      slider.scrollTo(1);
      await finished;
      const result = {
        index: slider.realIndex,
        starts,
        frames,
        transform: slider.container.style.transform,
        opacity: slider.slides.slice(0, 2).map((slide) => Number(getComputedStyle(slide).opacity)),
      };
      slider.destroy();
      return result;
    });
    expect(result.index).toBe(1);
    expect(result.starts).toBe(1);
    expect(result.frames).toBeGreaterThan(0);
    if (effect === 'fade') expect(result.opacity).toEqual([0, 1]);
    else expect(result.transform).toMatch(/rotateY\(-90deg\)/);
  });
}
