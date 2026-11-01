import { expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { check, mount, settle, type AuditWindow } from './browser-fixture';
import type { AuditCase } from './types';

const source = (repo: 'splide' | 'swiper', id: number) =>
  `https://github.com/${repo === 'splide' ? 'Splidejs/splide' : 'nolimits4web/swiper'}/issues/${id}`;
const cases: [string, string, AuditCase['priority'], string[]][] = [
  ['Autoplay advances once per delay', 'autoplay', 'P0', [source('swiper', 3846)]],
  ['Manual autoplay stop survives hover', 'autoplay', 'P0', [source('splide', 117)]],
  ['Focus continues pausing after hover leaves', 'autoplay', 'P0', [source('splide', 117)]],
  ['Hover continues pausing after focus leaves', 'autoplay', 'P0', [source('swiper', 7614)]],
  ['Manual stop survives hidden and visible', 'visibility', 'P0', [source('swiper', 3846)]],
  ['Manual pause survives hidden and visible', 'visibility', 'P1', [source('splide', 117)]],
  ['Display none pauses and restores autoplay', 'visibility', 'P0', [source('splide', 575)]],
  ['Ancestor visibility hidden pauses autoplay', 'visibility', 'P1', [source('splide', 575)]],
  ['Disable and enable allocate one autoplay timer', 'resources', 'P0', [source('swiper', 6263)]],
  ['Destroy prevents delayed autoplay changes', 'resources', 'P0', [source('swiper', 8036)]],
  [
    'Autoplay stays at finite end without duplicate change events',
    'autoplay',
    'P1',
    [source('swiper', 3846)],
  ],
  ['Rewind autoplay returns from last to first', 'autoplay', 'P1', [source('splide', 1362)]],
  ['Video waiting does not advance on a timer', 'video', 'P0', [source('swiper', 3846)]],
  ['Video ended while paused advances once on resume', 'video', 'P0', [source('splide', 117)]],
  ['Mute and unmute affect every HTML video', 'video', 'P1', [source('swiper', 7664)]],
  ['Leaving a video pauses and resets it', 'video', 'P1', [source('swiper', 7664)]],
  [
    'Destroyed video listeners ignore late media events',
    'resources',
    'P0',
    [source('swiper', 8036)],
  ],
  [
    'Lazy preload loads neighbors and preserves distant data-src',
    'lazy',
    'P1',
    [source('swiper', 6684)],
  ],
  ['Lazy loadSlide loads only the requested distant slide', 'lazy', 'P1', [source('splide', 461)]],
  ['Lazy loadAll handles nested images', 'lazy', 'P1', [source('splide', 461)]],
  [
    'Lazy load success removes its spinner and reveals image',
    'lazy',
    'P1',
    [source('splide', 527)],
  ],
  ['Lazy error removes loading state', 'lazy', 'P1', [source('splide', 461)]],
  ['Native lazy init promotes both neighbors', 'lazy', 'P1', [source('swiper', 6684)]],
  ['Native lazy transition promotes a distant target', 'lazy', 'P1', [source('swiper', 6684)]],
  ['Manual marquee stop survives visibility changes', 'visibility', 'P1', [source('splide', 117)]],
  ['Loop clones preserve unique form IDs', 'accessibility', 'P1', [source('splide', 1260)]],
  ['Generated navigation controls have accessible names', 'accessibility', 'P1', []],
  ['Navigation preserves keyboard focus', 'accessibility', 'P1', [source('splide', 1359)]],
  [
    'Disable and destroy preserve author tabindex',
    'accessibility',
    'P1',
    [source('splide', 1307), source('splide', 1185)],
  ],
  ['Lazy destroy removes pending spinners', 'resources', 'P1', [source('swiper', 8036)]],
  [
    'Generated controls pass automated accessibility checks',
    'accessibility',
    'P1',
    ['https://www.w3.org/WAI/ARIA/apg/patterns/carousel/'],
  ],
  [
    'Generated pagination is keyboard operable',
    'accessibility',
    'P1',
    ['https://www.w3.org/WAI/ARIA/apg/patterns/carousel/'],
  ],
  ['Long press pauses autoplay until pointer release', 'autoplay', 'P0', [source('splide', 117)]],
  [
    'Long press does not restart manually stopped autoplay',
    'autoplay',
    'P0',
    [source('splide', 117)],
  ],
];

export const mediaCases: AuditCase[] = cases.map(([title, family, priority, sources], index) => ({
  id: `MEDIA-${String(index + 1).padStart(3, '0')}`,
  title,
  family,
  priority,
  sources,
}));

const GIF = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const autoplay = {
  delay: 400,
  pauseOnHover: false,
  pauseOnFocus: false,
  pauseOnInteraction: false,
};
const imageContent = (native = false) =>
  Array.from(
    { length: 7 },
    (_, i) =>
      `<img alt="Card ${i}" ${native ? `src="${GIF}" loading="lazy"` : `data-src="${GIF}"`} width="40" height="40">`
  );

async function advance(page: Page, ms: number): Promise<void> {
  await page.clock.runFor(ms);
}

async function index(page: Page): Promise<number> {
  return page.evaluate(() => (window as unknown as AuditWindow).auditSlider.realIndex);
}

async function visibilityCycle(page: Page): Promise<void> {
  await page.evaluate(() => {
    const s = (window as unknown as AuditWindow).auditSlider;
    s.root.style.display = 'none';
    s.visibility?.check();
  });
  await advance(page, 500);
  await page.evaluate(() => {
    const s = (window as unknown as AuditWindow).auditSlider;
    s.root.style.display = '';
    s.visibility?.check();
  });
  await advance(page, 50);
}

/** Media events are controlled fixtures, not claims about real codec playback. */
async function controlledVideo(page: Page): Promise<void> {
  await page.evaluate(() => {
    document.querySelectorAll<HTMLVideoElement>('#audit-slider video').forEach((video) => {
      let paused = true;
      let currentTime = 0;
      Object.defineProperties(video, {
        paused: { configurable: true, get: () => paused },
        currentTime: {
          configurable: true,
          get: () => currentTime,
          set: (value: number) => {
            currentTime = value;
          },
        },
        duration: { configurable: true, get: () => 10 },
        readyState: { configurable: true, get: () => 4 },
      });
      video.play = async () => {
        paused = false;
        video.dispatchEvent(new Event('play'));
      };
      video.pause = () => {
        paused = true;
        video.dispatchEvent(new Event('pause'));
      };
      video.dispatchEvent(new Event('loadedmetadata'));
    });
  });
}

export async function runMediaCase(page: Page, id: string): Promise<void> {
  const number = Number(id.slice(-3));
  if (!mediaCases.some((c) => c.id === id)) throw new Error(`Unknown media audit case: ${id}`);
  if (number <= 14 || number === 25 || number >= 33) await page.clock.install();

  if (number <= 12) {
    await mount(
      page,
      {
        autoplay: {
          ...autoplay,
          pauseOnHover: number === 2 || number === 3 || number === 4,
          pauseOnFocus: number === 3 || number === 4,
        },
        visibility: number >= 5 && number <= 8,
        rewind: number === 12,
        start: number === 11 || number === 12 ? 2 : 0,
      },
      { count: 3, contents: ['<button id="media-focus">First</button>', 'Second', 'Third'] }
    );
    if (number === 1) {
      await advance(page, 410);
      expect(await index(page), 'autoplay-one-tick').toBe(1);
    } else if (number === 2) {
      await page.evaluate(() => {
        const s = (window as unknown as AuditWindow).auditSlider;
        s.autoplay!.stop();
        s.root.dispatchEvent(new MouseEvent('mouseenter'));
        s.root.dispatchEvent(new MouseEvent('mouseleave'));
      });
      await advance(page, 1000);
      expect(await index(page), 'stopped-autoplay-index').toBe(0);
      expect(
        await page.evaluate(() =>
          (window as unknown as AuditWindow).auditSlider.autoplay!.isStopped()
        ),
        'manual-stop-preserved'
      ).toBe(true);
    } else if (number === 3 || number === 4) {
      await page.evaluate((mode) => {
        const s = (window as unknown as AuditWindow).auditSlider;
        s.root.dispatchEvent(new MouseEvent('mouseenter'));
        document.querySelector<HTMLButtonElement>('#media-focus')!.focus();
        if (mode === 3) s.root.dispatchEvent(new MouseEvent('mouseleave'));
        else document.querySelector<HTMLButtonElement>('#media-focus')!.blur();
      }, number);
      await advance(page, 1000);
      expect(await index(page), 'remaining-pause-reason').toBe(0);
      expect(
        await page.evaluate(() =>
          (window as unknown as AuditWindow).auditSlider.autoplay!.isPaused()
        ),
        'paused-with-other-reason'
      ).toBe(true);
    } else if (number === 5 || number === 6) {
      await page.evaluate((mode) => {
        const api = (window as unknown as AuditWindow).auditSlider.autoplay!;
        if (mode === 5) api.stop();
        else api.pause();
      }, number);
      await visibilityCycle(page);
      await advance(page, 1000);
      expect(await index(page), 'manual-motion-state-survives-visibility').toBe(0);
      const state = await page.evaluate(() => {
        const api = (window as unknown as AuditWindow).auditSlider.autoplay!;
        return { stopped: api.isStopped(), paused: api.isPaused() };
      });
      expect(number === 5 ? state.stopped : state.paused, 'manual-motion-state').toBe(true);
    } else if (number === 7 || number === 8) {
      await page.evaluate((mode) => {
        const s = (window as unknown as AuditWindow).auditSlider;
        if (mode === 7) s.root.style.display = 'none';
        else {
          const wrapper = document.createElement('div');
          s.root.before(wrapper);
          wrapper.appendChild(s.root);
          // Tvist's created class explicitly sets visibility:visible. Make this
          // fixture genuinely inherit the ancestor state before testing it.
          s.root.style.visibility = 'inherit';
          wrapper.style.visibility = 'hidden';
        }
        s.visibility!.check();
      }, number);
      await advance(page, 1000);
      expect(await index(page), 'hidden-autoplay-stays').toBe(0);
      expect(
        await page.evaluate(() =>
          (window as unknown as AuditWindow).auditSlider.visibility!.isVisible()
        ),
        'hidden-state'
      ).toBe(false);
      await page.evaluate(() => {
        const s = (window as unknown as AuditWindow).auditSlider;
        s.root.style.display = '';
        s.root.style.visibility = '';
        s.root.parentElement!.style.visibility = '';
        s.visibility!.check();
      });
      await advance(page, 410);
      expect(await index(page), 'visible-autoplay-resumes-once').toBe(1);
    } else if (number === 9) {
      await page.evaluate(() => {
        const s = (window as unknown as AuditWindow).auditSlider;
        for (let i = 0; i < 5; i++) s.disable().enable();
      });
      await advance(page, 410);
      expect(await index(page), 'single-autoplay-after-toggle').toBe(1);
    } else if (number === 10) {
      const before = await page.evaluate(() => {
        const s = (window as unknown as AuditWindow).auditSlider;
        s.destroy();
        return s.root.outerHTML;
      });
      await advance(page, 2000);
      expect(
        await page.locator('#audit-slider').evaluate((el) => el.outerHTML),
        'destroyed-dom-stable'
      ).toBe(before);
      expect(
        await page
          .locator('#audit-slider')
          .evaluate((el) =>
            Boolean((el as HTMLElement & { tvistInstance?: unknown }).tvistInstance)
          ),
        'destroyed-instance-detached'
      ).toBe(false);
    } else if (number === 11) {
      await page.evaluate(() => {
        const w = window as unknown as AuditWindow & { auditChanges: number };
        w.auditChanges = 0;
        w.auditSlider.on('slideChangeEnd', () => w.auditChanges++);
      });
      await advance(page, 2000);
      expect(await index(page), 'autoplay-finite-boundary').toBe(2);
      expect(
        await page.evaluate(() => (window as unknown as { auditChanges: number }).auditChanges),
        'boundary-has-no-changes'
      ).toBe(0);
    } else {
      await advance(page, 410);
      expect(await index(page), 'autoplay-rewind').toBe(0);
    }
    if (number !== 10) await check(page);
    return;
  }

  if (number >= 13 && number <= 17) {
    await mount(
      page,
      {
        video: { autoplay: false, pauseOnLeave: true, resetOnLeave: number === 16 },
        autoplay: number <= 14 ? { ...autoplay, waitForVideo: true } : false,
      },
      { count: 3, contents: ['<video></video>', '<video></video>', '<video></video>'] }
    );
    await controlledVideo(page);
    if (number === 13) {
      await advance(page, 1200);
      expect(await index(page), 'video-wait-suppresses-delay').toBe(0);
    } else if (number === 14) {
      await page.evaluate(() => {
        const s = (window as unknown as AuditWindow).auditSlider;
        s.autoplay!.pause();
        s.slides[0]!.querySelector('video')!.dispatchEvent(new Event('ended'));
      });
      await advance(page, 800);
      expect(await index(page), 'ended-while-paused-stays').toBe(0);
      await page.evaluate(() => (window as unknown as AuditWindow).auditSlider.autoplay!.resume());
      await advance(page, 100);
      expect(await index(page), 'resume-consumes-ended-once').toBe(1);
    } else if (number === 15) {
      const result = await page.evaluate(() => {
        const s = (window as unknown as AuditWindow).auditSlider;
        const videos = [...s.root.querySelectorAll('video')];
        s.video!.unmute();
        const unmuted = videos.every((video) => !video.muted) && !s.video!.isMuted();
        s.video!.mute();
        return {
          unmuted,
          muted: videos.every((video) => video.muted) && s.video!.isMuted(),
          inline: videos.every((video) => video.hasAttribute('playsinline')),
        };
      });
      expect(result, 'video-controls-and-inline').toEqual({
        unmuted: true,
        muted: true,
        inline: true,
      });
    } else if (number === 16) {
      const result = await page.evaluate(async () => {
        const s = (window as unknown as AuditWindow).auditSlider;
        const video = s.slides[0]!.querySelector('video')!;
        s.video!.play(0);
        video.currentTime = 4;
        s.next();
        await Promise.resolve();
        return { paused: video.paused, time: video.currentTime, index: s.realIndex };
      });
      expect(result, 'video-leave-contract').toEqual({ paused: true, time: 0, index: 1 });
    } else {
      const result = await page.evaluate(() => {
        const s = (window as unknown as AuditWindow).auditSlider;
        const video = s.slides[0]!.querySelector('video')!;
        let events = 0;
        for (const name of ['videoReady', 'videoPlay', 'videoEnded', 'videoProgress'])
          s.on(name, () => events++);
        s.destroy();
        for (const name of ['loadedmetadata', 'play', 'ended', 'timeupdate'])
          video.dispatchEvent(new Event(name));
        return events;
      });
      expect(result, 'late-media-events-after-destroy').toBe(0);
      return;
    }
    await settle(page);
    await check(page);
    return;
  }

  if ((number >= 18 && number <= 24) || number === 30) {
    const nested = number === 20;
    const native = number === 23 || number === 24;
    const contents = imageContent(native).map((html) =>
      nested ? `<a href="#image">${html}</a>` : html
    );
    if (number === 22 || number === 30)
      contents[0] = '<img alt="Delayed image" data-src="/audit-pending-image.png">';
    if (number === 22 || number === 30)
      await page.route('**/audit-pending-image.png', (route) =>
        route.fulfill({ status: 200, contentType: 'image/png', body: Buffer.from('not-an-image') })
      );
    await mount(
      page,
      {
        start: number === 23 ? 3 : 0,
        lazy: native ? false : { preloadPrevNext: number === 18 ? 1 : 0 },
        nativeLazyAdjacent: native ? { onInit: number === 23, onTransitionStart: true } : false,
      },
      { count: 7, contents }
    );
    if (number === 18) {
      const loaded = await page
        .locator('#audit-slider img')
        .evaluateAll((images) => images.map((image) => image.hasAttribute('src')));
      expect(loaded, 'lazy-nearby-and-distant').toEqual([
        true,
        true,
        false,
        false,
        false,
        false,
        false,
      ]);
    } else if (number === 19) {
      await page.evaluate(() =>
        (window as unknown as AuditWindow).auditSlider.lazyload!.loadSlide(5)
      );
      const loaded = await page
        .locator('#audit-slider img')
        .evaluateAll((images) => images.map((image) => image.hasAttribute('src')));
      expect(loaded, 'manual-loadSlide-selection').toEqual([
        true,
        false,
        false,
        false,
        false,
        true,
        false,
      ]);
    } else if (number === 20) {
      await page.evaluate(() => (window as unknown as AuditWindow).auditSlider.lazyload!.loadAll());
      expect(await page.locator('#audit-slider img[data-src]').count(), 'nested-lazy-loadAll').toBe(
        0
      );
    } else if (number === 21) {
      const first = page.locator('#audit-slider img').first();
      await expect
        .poll(() => first.evaluate((image) => (image as HTMLImageElement).naturalWidth), {
          message: 'lazy-image-decoded',
        })
        .toBeGreaterThan(0);
      await expect(first, 'loaded-image-visible').toBeVisible();
      await expect(
        page.locator('#audit-slider .tvist-v1__slide').first().locator('.tvist-v1__spinner'),
        'loaded-spinner-removed'
      ).toHaveCount(0);
    } else if (number === 22) {
      await expect(
        page.locator('#audit-slider .tvist-v1__slide').first(),
        'error-clears-loading'
      ).not.toHaveClass(/--loading/);
      await expect(
        page.locator('#audit-slider .tvist-v1__slide').first().locator('.tvist-v1__spinner'),
        'error-clears-spinner'
      ).toHaveCount(0);
    } else if (number === 23) {
      const loading = await page
        .locator('#audit-slider img')
        .evaluateAll((images) => images.map((image) => (image as HTMLImageElement).loading));
      expect(loading[2], 'native-prev-promoted').toBe('eager');
      expect(loading[4], 'native-next-promoted').toBe('eager');
      expect(loading[0], 'native-distant-preserved').toBe('lazy');
    } else if (number === 24) {
      await page.evaluate(() => (window as unknown as AuditWindow).auditSlider.scrollTo(5, true));
      expect(
        await page.locator('#audit-slider img').nth(5).getAttribute('loading'),
        'native-target-promoted'
      ).toBe('eager');
    } else {
      await page.evaluate(() => (window as unknown as AuditWindow).auditSlider.destroy());
      await expect(
        page.locator('#audit-slider .tvist-v1__spinner'),
        'destroy-removes-all-spinners'
      ).toHaveCount(0);
      return;
    }
    await settle(page);
    await check(page);
    return;
  }

  if (number === 25) {
    await mount(page, {
      loop: true,
      marquee: { speed: 40, pauseOnHover: false },
      visibility: true,
    });
    await page.evaluate(() => (window as unknown as AuditWindow).auditSlider.marquee!.stop());
    await visibilityCycle(page);
    const before = await page.locator('#audit-slider .tvist-v1__container').getAttribute('style');
    await advance(page, 1000);
    expect(
      await page.evaluate(() =>
        (window as unknown as AuditWindow).auditSlider.marquee!.isStopped()
      ),
      'manual-marquee-stop'
    ).toBe(true);
    expect(
      await page.locator('#audit-slider .tvist-v1__container').getAttribute('style'),
      'stopped-marquee-geometry'
    ).toBe(before);
  } else if (number === 26) {
    await mount(
      page,
      { loop: { withClones: true } },
      {
        count: 3,
        contents: Array.from(
          { length: 3 },
          (_, i) =>
            `<label for="field-${i}">Option ${i}</label><input id="field-${i}" type="checkbox">`
        ),
      }
    );
    const ids = await page
      .locator('#audit-slider [id]')
      .evaluateAll((elements) => elements.map((element) => element.id));
    expect(new Set(ids).size, 'clone-form-ids-unique').toBe(ids.length);
  } else if (number === 27 || number === 28) {
    await mount(page, { arrows: true });
    const next = page.locator('#audit-slider .tvist-v1__arrow--next');
    if (number === 27) {
      for (const side of ['next', 'prev']) {
        const button = page.locator(`#audit-slider .tvist-v1__arrow--${side}`);
        expect(
          await button.evaluate((element) => element.tagName),
          'navigation-native-button'
        ).toBe('BUTTON');
        await expect(button, 'navigation-accessible-name').toHaveAccessibleName(/\S+/);
      }
    } else {
      await next.focus();
      await page.keyboard.press('Enter');
      await settle(page);
      expect(await index(page), 'keyboard-navigation-moved').toBe(1);
      await expect(next, 'navigation-focus-retained').toBeFocused();
    }
  } else if (number === 29) {
    await mount(
      page,
      { loop: true },
      {
        count: 3,
        contents: [
          '<button tabindex="-1">Never tab</button>',
          '<button tabindex="0">Tab</button>',
          '<button>Default</button>',
        ],
      }
    );
    const result = await page.evaluate(() => {
      const s = (window as unknown as AuditWindow).auditSlider;
      s.next();
      s.disable();
      s.enable();
      s.destroy();
      return [...s.root.querySelectorAll('button')].map((button) =>
        button.getAttribute('tabindex')
      );
    });
    expect(result, 'author-tabindex-preserved').toEqual(['-1', '0', null]);
  } else if (number === 31) {
    await mount(page, { arrows: true, pagination: true });
    await page.locator('#audit-slider').evaluate((root) => {
      root.setAttribute('role', 'region');
      root.setAttribute('aria-label', 'Product gallery');
    });
    const result = await new AxeBuilder({ page })
      .include('#audit-slider')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const violations = result.violations.map((violation) => ({
      rule: violation.id,
      impact: violation.impact,
      targets: violation.nodes.map((node) => node.target),
    }));
    expect(violations, 'axe-generated-controls').toEqual([]);
  } else if (number === 32) {
    await mount(page, { pagination: true });
    const bullets = page.locator('#audit-slider .tvist-v1__bullet');
    const firstTabStop = await bullets.evaluateAll((elements) =>
      elements.findIndex((element) => (element as HTMLElement).tabIndex >= 0)
    );
    if (firstTabStop < 0)
      throw new Error(
        'CONTRACT_GAP: generated pagination has no keyboard entry point. A11y capability gap; the separately documented keyboard option is not implemented. Keyboard activation steps were blocked.'
      );
    await page.keyboard.press('Tab');
    await expect(bullets.nth(firstTabStop), 'pagination-tab-entry-focused').toBeFocused();
    const second = bullets.nth(1);
    const individuallyTabbable = await second.evaluate(
      (element) => (element as HTMLElement).tabIndex >= 0
    );
    // Both ordinary button groups and the tab pattern with roving tabindex are valid.
    await page.keyboard.press(individuallyTabbable ? 'Tab' : 'ArrowRight');
    await expect(second, 'pagination-focused').toBeFocused();
    await page.keyboard.press('Enter');
    await settle(page);
    expect(await index(page), 'pagination-enter-navigates').toBe(1);
  } else if (number === 33 || number === 34) {
    await mount(page, { holdToPause: { threshold: 100 }, autoplay });
    if (number === 34)
      await page.evaluate(() => (window as unknown as AuditWindow).auditSlider.autoplay!.stop());
    const bounds = await page.locator('#audit-slider').boundingBox();
    expect(bounds, 'hold-target-visible').not.toBeNull();
    await page.mouse.move(bounds!.x + bounds!.width / 2, bounds!.y + bounds!.height / 2);
    await page.mouse.down();
    await advance(page, 150);
    expect(
      await page.evaluate(() =>
        (window as unknown as AuditWindow).auditSlider.autoplay!.isPaused()
      ),
      'hold-pauses-autoplay'
    ).toBe(true);
    await advance(page, 900);
    expect(await index(page), 'hold-freezes-index').toBe(0);
    await page.mouse.up();
    await advance(page, 410);
    expect(
      await index(page),
      number === 33 ? 'hold-release-resumes' : 'hold-preserves-manual-stop'
    ).toBe(number === 33 ? 1 : 0);
  }
}
