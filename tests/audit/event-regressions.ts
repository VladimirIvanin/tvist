import { expect, type Page } from '@playwright/test';
import { mount, type AuditWindow } from './browser-fixture';
import type { AuditCase } from './types';

export const eventRegressionCases: AuditCase[] = [
  {
    id: 'EREG-001',
    family: 'video-events',
    priority: 'P0',
    title: 'A read-only videoEnded subscriber cannot turn one active ended into two transitions',
    sources: [
      'https://github.com/VladimirIvanin/tvist/blob/dea54d579239cd29224303c90646f00b577ec41c/docs/examples/video.md#события',
    ],
  },
];

/** Controlled media events, no codec/network timing. Only the public subscriber differs. */
async function oneActiveEnded(page: Page, observe: boolean) {
  await mount(
    page,
    { video: false, autoplay: false },
    {
      count: 3,
      contents: [0, 1, 2].map((index) => `<video muted playsinline data-owner="${index}"></video>`),
    }
  );
  return page.evaluate(async (observe) => {
    const w = window as unknown as AuditWindow;
    const slider = w.auditSlider;
    const entries = new Map<HTMLVideoElement, { paused: boolean; ended: boolean; time: number }>();
    for (const video of slider.root.querySelectorAll('video')) {
      const state = { paused: true, ended: false, time: 0 };
      entries.set(video, state);
      Object.defineProperties(video, {
        paused: { configurable: true, get: () => state.paused },
        ended: { configurable: true, get: () => state.ended },
        readyState: { configurable: true, get: () => 4 },
        duration: { configurable: true, get: () => 4 },
        currentTime: {
          configurable: true,
          get: () => state.time,
          set: (time: number) => {
            state.time = time;
          },
        },
      });
      video.play = async () => {
        state.paused = false;
        state.ended = false;
        video.dispatchEvent(new Event('play'));
      };
      video.pause = () => {
        state.paused = true;
        video.dispatchEvent(new Event('pause'));
      };
    }
    slider.updateOptions({
      video: { autoplay: false, pauseOnLeave: true },
      autoplay: {
        waitForVideo: true,
        delay: 5000,
        pauseOnHover: false,
        pauseOnFocus: false,
        pauseOnInteraction: false,
      },
    });
    const source = w.auditOriginals?.[slider.realIndex]?.querySelector('video');
    if (!source || source.dataset.owner !== '0' || !entries.has(source))
      throw new Error('AUDIT_FIXTURE_ERROR: connected original video 0 required');
    const native: number[] = [];
    const payloads: { index: number; sameVideo: boolean }[] = [];
    const changes: number[] = [];
    const played: number[] = [];
    source.addEventListener('ended', () => native.push(Number(source.dataset.owner)));
    slider.on('videoPlay', (event: { index: number }) => played.push(event.index));
    slider.on('slideChangeEnd', (index: number) => changes.push(index));
    if (observe)
      slider.on('videoEnded', (event: { index: number; video: HTMLVideoElement }) =>
        payloads.push({ index: event.index, sameVideo: event.video === source })
      );
    slider.video!.play();
    await Promise.resolve();
    source.currentTime = 1.25;
    const before = {
      index: slider.realIndex,
      ready: source.readyState,
      playing: !source.paused,
      time: source.currentTime,
      played: [...played],
    };
    const state = entries.get(source)!;
    state.paused = true;
    state.ended = true;
    state.time = 4;
    source.dispatchEvent(new Event('ended'));
    await new Promise<void>((done) =>
      requestAnimationFrame(() => requestAnimationFrame(() => done()))
    );
    return { before, native, payloads, index: slider.realIndex, changes };
  }, observe);
}

export async function runEventRegressionCase(page: Page, id: string): Promise<void> {
  if (id !== 'EREG-001') throw new Error(`Unknown event regression ${id}`);
  const control = await oneActiveEnded(page, false);
  const observed = await oneActiveEnded(page, true);
  for (const result of [control, observed]) {
    expect(result.before, 'EREG-positive-controlled-current-video-playing').toEqual({
      index: 0,
      ready: 4,
      playing: true,
      time: 1.25,
      played: [0],
    });
    expect(result.native, 'EREG-exactly-one-ended-original').toEqual([0]);
  }
  expect([control.index, control.changes], 'EREG-without-subscriber-positive-one-step').toEqual([
    1,
    [1],
  ]);
  expect(observed.payloads, 'EREG-observer-receives-exactly-one-correct-payload').toEqual([
    { index: 0, sameVideo: true },
  ]);
  expect(
    [observed.index, observed.changes],
    'EREG-read-only-subscriber-preserves-one-step'
  ).toEqual([1, [1]]);
}
