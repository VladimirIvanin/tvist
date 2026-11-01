import { expect, type Page } from '@playwright/test';
import { mount, type AuditWindow } from './browser-fixture';
import type { RiskFamilyManifest } from './risk-coverage';
import type { AuditCase } from './types';

const domains = {
  autoplay: ['timer', 'waitForVideo'],
  videoEnded: ['active', 'inactive'],
  pauseReason: ['hover', 'focus', 'manual-stop'],
} as const;
type Factors = { [K in keyof typeof domains]: (typeof domains)[K][number] };
type RiskMediaCase = AuditCase & { factors: Factors };
const sources = [
  'https://github.com/Splidejs/splide/issues/117',
  'https://github.com/nolimits4web/swiper/issues/3846',
  'https://github.com/nolimits4web/swiper/issues/7614',
];
export const riskMediaCases: RiskMediaCase[] = [];
for (const autoplay of domains.autoplay)
  for (const videoEnded of domains.videoEnded)
    for (const pauseReason of domains.pauseReason) {
      const factors = { autoplay, videoEnded, pauseReason };
      riskMediaCases.push({
        id: `RISK-07-${String(riskMediaCases.length).padStart(3, '0')}`,
        family: 'R07',
        priority: 'P0',
        sources,
        title: `Controlled ${autoplay}: ${videoEnded} video ended while ${pauseReason} holds navigation`,
        factors,
      });
    }
export const riskMediaManifest: RiskFamilyManifest[] = [
  {
    family: 'R07',
    domains,
    tuples: riskMediaCases.map((entry) => ({ id: entry.id, factors: { ...entry.factors } })),
  },
];

const delay = 500;
interface MediaEntry {
  paused: boolean;
  ended: boolean;
  currentTime: number;
}
interface Evidence {
  index: number;
  changes: number[];
  ended: { index: number; correctNode: boolean }[];
  stopped: boolean;
  paused: boolean;
}
interface RiskState {
  media: Map<HTMLVideoElement, MediaEntry>;
  changes: number[];
  ended: { index: number; correctNode: boolean }[];
  played: number[];
  timeline: { phase: string; state: Evidence }[];
}
type RiskWindow = AuditWindow & { auditRiskMedia: RiskState };

async function evidence(page: Page, phase: string): Promise<Evidence> {
  return page.evaluate((phase) => {
    const w = window as unknown as RiskWindow;
    const state = w.auditRiskMedia;
    const s = w.auditSlider;
    const result = {
      index: s.realIndex,
      changes: [...state.changes],
      ended: [...state.ended],
      stopped: s.autoplay!.isStopped(),
      paused: s.autoplay!.isPaused(),
    };
    state.timeline.push({ phase, state: result });
    return result;
  }, phase);
}

async function dispatchEnded(page: Page, owner: Factors['videoEnded']): Promise<number> {
  return page.evaluate((owner) => {
    const w = window as unknown as RiskWindow;
    const s = w.auditSlider;
    const state = w.auditRiskMedia;
    const index = owner === 'active' ? s.realIndex : (s.realIndex + 1) % s.originalSlideCount;
    const slide = w.auditOriginals?.[index];
    const video = slide?.querySelector('video');
    if (
      !slide?.isConnected ||
      !video ||
      video.dataset.mediaOwner !== String(index) ||
      !state.media.has(video)
    )
      throw new Error(`AUDIT_FIXTURE_ERROR: missing controlled original video ${index}`);
    const entry = state.media.get(video)!;
    entry.currentTime = 4;
    entry.paused = true;
    entry.ended = true;
    video.dispatchEvent(new Event('ended'));
    return index;
  }, owner);
}

async function installControlledMedia(page: Page, mode: Factors['autoplay']): Promise<void> {
  await page.clock.install();
  // mount() settles real RAF before the clock is frozen; media/autoplay are not active yet.
  await mount(
    page,
    { video: false, autoplay: false },
    {
      count: 3,
      contents: [0, 1, 2].map(
        (index) =>
          `<button type="button" data-focus-owner="${index}">Focus ${index}</button><video muted playsinline data-media-owner="${index}"></video>`
      ),
    }
  );
  await page.clock.pauseAt(new Date((await page.evaluate(() => Date.now())) + 1000));
  await page.evaluate(
    ({ mode, delay }) => {
      const w = window as unknown as RiskWindow;
      const s = w.auditSlider;
      const state: RiskState = {
        media: new Map(),
        changes: [],
        ended: [],
        played: [],
        timeline: [],
      };
      w.auditRiskMedia = state;
      for (const video of s.root.querySelectorAll('video')) {
        const entry: MediaEntry = { paused: true, ended: false, currentTime: 0 };
        state.media.set(video, entry);
        Object.defineProperties(video, {
          paused: { configurable: true, get: () => entry.paused },
          ended: { configurable: true, get: () => entry.ended },
          currentTime: {
            configurable: true,
            get: () => entry.currentTime,
            set: (time: number) => {
              entry.currentTime = time;
            },
          },
          duration: { configurable: true, get: () => 4 },
          readyState: { configurable: true, get: () => 4 },
        });
        video.play = async () => {
          if (entry.ended) entry.currentTime = 0;
          entry.paused = false;
          entry.ended = false;
          video.dispatchEvent(new Event('play'));
        };
        video.pause = () => {
          entry.paused = true;
          video.dispatchEvent(new Event('pause'));
        };
        // Observe the independent DOM owner. A public videoEnded subscriber is a separate
        // input: it retains the live EventEmitter Set while Autoplay replaces its listener.
        video.addEventListener('ended', () => {
          const index = Number(video.dataset.mediaOwner);
          state.ended.push({
            index,
            correctNode: w.auditOriginals?.[index]?.querySelector('video') === video,
          });
        });
      }
      s.updateOptions({
        video: { autoplay: false, muted: true, pauseOnLeave: true },
        autoplay: {
          delay,
          waitForVideo: mode === 'waitForVideo',
          pauseOnFocus: true,
          pauseOnHover: true,
          pauseOnInteraction: false,
        },
      });
      s.on('slideChangeEnd', (index: number) => state.changes.push(index));
      s.on('videoPlay', (event: { index: number }) => state.played.push(event.index));
      if (!s.autoplay || !s.video)
        throw new Error('R07: configured public media controls are missing');
      s.video.play();
    },
    { mode, delay }
  );

  // Positive controls use the actual current original, prove the public event bridge,
  // and distinguish timer-driven switching from active-video-driven switching.
  const owner = await dispatchEnded(page, 'active');
  await page.clock.runFor(24);
  const beforeTimer = await evidence(page, 'positive-active-ended-before-timer');
  expect(owner, 'R07-initial-active-owner').toBe(0);
  expect(beforeTimer.ended, 'R07-positive-current-video-DOM-owner').toEqual([
    { index: 0, correctNode: true },
  ]);
  expect(
    await page.evaluate(() => (window as unknown as RiskWindow).auditRiskMedia.played.includes(0)),
    'R07-positive-active-play-control'
  ).toBe(true);
  expect(beforeTimer.index, 'R07-positive-ended-vs-timer').toBe(mode === 'waitForVideo' ? 1 : 0);
  await page.clock.runFor(delay + 16);
  const afterTimer = await evidence(page, 'positive-one-advance');
  expect([afterTimer.index, afterTimer.changes], 'R07-positive-one-advance').toEqual([1, [1]]);
  await page.evaluate(() => {
    const w = window as unknown as RiskWindow;
    const s = w.auditSlider;
    s.prev();
    s.autoplay!.start();
    s.video!.play();
    w.auditRiskMedia.changes = [];
    w.auditRiskMedia.ended = [];
  });
  await page.clock.runFor(16);
  expect((await evidence(page, 'scenario-start')).index, 'R07-reset-to-first-original').toBe(0);
}

async function holdTwoReasons(page: Page, reason: Factors['pauseReason']): Promise<void> {
  const focused = await page.evaluate((reason) => {
    const s = (window as unknown as RiskWindow).auditSlider;
    const button = s.root.querySelector<HTMLButtonElement>('[data-focus-owner="0"]');
    if (!button) throw new Error('AUDIT_FIXTURE_ERROR: missing focus target');
    if (reason === 'manual-stop') {
      s.autoplay!.stop();
      s.root.dispatchEvent(new MouseEvent('mouseenter'));
    } else if (reason === 'hover') {
      s.root.dispatchEvent(new MouseEvent('mouseenter'));
      button.focus();
    } else {
      button.focus();
      s.root.dispatchEvent(new MouseEvent('mouseenter'));
    }
    return document.activeElement === button;
  }, reason);
  if (reason !== 'manual-stop' && !focused)
    throw new Error('AUDIT_FIXTURE_ERROR: browser focus did not reach the connected button');
}
async function releaseReason(page: Page, release: 'hover' | 'focus'): Promise<void> {
  await page.evaluate((release) => {
    const root = (window as unknown as RiskWindow).auditSlider.root;
    if (release === 'hover') root.dispatchEvent(new MouseEvent('mouseleave'));
    else root.querySelector<HTMLButtonElement>('[data-focus-owner="0"]')!.blur();
  }, release);
}

/** R07: local Tvist waitForVideo/pause contracts, controlled events; no native codec claim. */
export async function runRiskMediaCase(page: Page, id: string): Promise<void> {
  const entry = riskMediaCases.find((candidate) => candidate.id === id);
  if (!entry) throw new Error(`Unknown R07 media case ${id}`);
  const { autoplay, videoEnded, pauseReason } = entry.factors;
  try {
    await installControlledMedia(page, autoplay);
    await holdTwoReasons(page, pauseReason);
    const owner = await dispatchEnded(page, videoEnded);
    await page.clock.runFor(delay + 32);
    const held = await evidence(page, 'two-reasons-held');
    await releaseReason(page, pauseReason === 'hover' ? 'focus' : 'hover');
    await page.clock.runFor(delay + 32);
    const remaining = await evidence(page, 'one-reason-still-held');
    // Execute both holds before asserting, so an early failing stop still has evidence
    // for the secondary hover release. No claim about unexecuted later phases.
    expect(held.ended, 'R07-event-owner-is-requested-original').toEqual([
      { index: owner, correctNode: true },
    ]);
    expect([held.index, held.changes], 'R07-ended-cannot-override-two-holds').toEqual([0, []]);
    expect(
      [remaining.index, remaining.changes],
      'R07-remaining-reason-prevents-navigation'
    ).toEqual([0, []]);
    if (pauseReason === 'manual-stop') {
      expect(remaining.stopped, 'R07-manual-stop-remains-stopped').toBe(true);
      return;
    }
    await releaseReason(page, pauseReason);
    await page.clock.runFor(24);
    const released = await evidence(page, 'all-passive-reasons-released');
    const expectedNow = autoplay === 'waitForVideo' && videoEnded === 'active' ? 1 : 0;
    expect([released.index, released.changes], 'R07-release-consumes-only-active-ended').toEqual([
      expectedNow,
      expectedNow ? [1] : [],
    ]);
    await page.clock.runFor(delay + 16);
    const later = await evidence(page, 'one-delay-after-release');
    const expectedLater = autoplay === 'timer' ? 1 : expectedNow;
    expect(
      [later.index, later.changes],
      'R07-timer-or-current-video-drives-exactly-one-step'
    ).toEqual([expectedLater, expectedLater ? [1] : []]);
    if (autoplay === 'waitForVideo' && videoEnded === 'inactive') {
      await dispatchEnded(page, 'active');
      await page.clock.runFor(24);
      const positive = await evidence(page, 'real-current-ended-after-inactive');
      expect([positive.index, positive.changes], 'R07-active-ended-still-operable').toEqual([
        1,
        [1],
      ]);
    }
  } finally {
    // Let the parent runner capture screenshots/traces with working RAF even on failure.
    await page.clock.resume().catch(() => undefined);
  }
}
