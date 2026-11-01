import { expect, type Page } from '@playwright/test';
import { mount, settle, type AuditWindow } from './browser-fixture';
import type { AuditCase } from './types';

export const nativeMediaCases: AuditCase[] = [
  {
    id: 'NATIVE-001',
    title: 'Native decoded video advances, pauses, resumes and resets on leave',
    family: 'native-video',
    priority: 'P0',
    sources: [],
  },
  {
    id: 'NATIVE-002',
    title: 'Loop copies play only the physically visible native video',
    family: 'native-video',
    priority: 'P1',
    sources: [],
  },
  {
    id: 'NATIVE-003',
    title: 'Late native video readiness cannot restart a slide after leaving',
    family: 'native-video',
    priority: 'P1',
    sources: [],
  },
];

const videoMarkup = (name: string, query = '') =>
  `<video data-native-video="${name}" src="/fixture.webm${query}" preload="auto" muted playsinline width="320" height="180"></video>`;

/** Prove that this environment decodes and plays this exact fixture independently of Tvist. */
async function requireNativeCodec(page: Page): Promise<void> {
  const response = await page.request.get(new URL('/fixture.webm', page.url()).href);
  if (!response.ok() || (await response.body()).length < 500)
    throw new Error(`FIXTURE_TRANSPORT: /fixture.webm HTTP ${response.status()}`);
  const result = await page.evaluate(async () => {
    const video = document.createElement('video');
    const support = video.canPlayType('video/webm');
    type PlayRejection = { name: string; message: string };
    type ReadySignal =
      | { phase: 'ready' | 'media-error' | 'timeout' }
      | { phase: 'initial-play-rejection'; rejection: PlayRejection };
    const rejectionOf = (error: unknown): PlayRejection => {
      const value = error as { name?: unknown; message?: unknown } | null;
      return {
        name: typeof value?.name === 'string' ? value.name : 'UnknownError',
        message: typeof value?.message === 'string' ? value.message : String(error),
      };
    };
    const observation = (
      kind: 'supported' | 'unsupported' | 'policy' | 'fixture',
      phase: string,
      rejection?: PlayRejection
    ) => {
      const value = {
        kind,
        phase,
        canPlayType: support,
        rejectionName: rejection?.name ?? null,
        rejectionMessage: rejection?.message ?? null,
        mediaErrorCode: video.error?.code ?? null,
        mediaErrorMessage: video.error?.message ?? null,
        readyState: video.readyState,
        currentTime: video.currentTime,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
      };
      (window as unknown as { auditCampaignMetrics: unknown }).auditCampaignMetrics = {
        nativeCodecPreflight: value,
      };
      return value;
    };
    const failure = (phase: string, rejection?: PlayRejection) => {
      if (rejection?.name === 'NotAllowedError') return observation('policy', phase, rejection);
      if (
        rejection?.name === 'NotSupportedError' ||
        video.error?.code === 3 ||
        video.error?.code === 4
      )
        return observation('unsupported', phase, rejection);
      return observation('fixture', phase, rejection);
    };
    if (!support) return observation('unsupported', 'empty-canPlayType');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.src = '/fixture.webm?native-codec-probe';
    document.body.append(video);
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const ready = await new Promise<ReadySignal>((done) => {
        video.onloadeddata = () => done({ phase: 'ready' });
        video.onerror = () => done({ phase: 'media-error' });
        timer = setTimeout(() => done({ phase: 'timeout' }), 8000);
        video.load();
        // Some ports do not start decoder selection until play is requested.
        void video
          .play()
          .catch((error) =>
            done({ phase: 'initial-play-rejection', rejection: rejectionOf(error) })
          );
      });
      if (ready.phase === 'initial-play-rejection') return failure(ready.phase, ready.rejection);
      if (ready.phase !== 'ready') return failure(ready.phase);
      try {
        await video.play();
      } catch (error) {
        return failure('ready-play-rejection', rejectionOf(error));
      }
      await new Promise<void>((done) => setTimeout(done, 220));
      return video.currentTime > 0.05 && video.videoWidth > 0 && video.videoHeight > 0
        ? observation('supported', 'decoded-playback-advanced')
        : observation('fixture', 'decoded-playback-did-not-advance');
    } finally {
      if (timer) clearTimeout(timer);
      video.pause();
      video.removeAttribute('src');
      video.load();
      video.remove();
    }
  });
  if (result.kind === 'unsupported')
    throw new Error(`UNSUPPORTED_CODEC: ${JSON.stringify(result)}`);
  if (result.kind !== 'supported')
    throw new Error(`NATIVE_MEDIA_ENVIRONMENT: ${JSON.stringify(result)}`);
}

async function waitForProgress(page: Page, name: string): Promise<void> {
  await page.waitForFunction(
    (name) => {
      const video = document.querySelector<HTMLVideoElement>(`video[data-native-video="${name}"]`);
      return video && !video.paused && video.currentTime > 0.12 && video.videoWidth > 0;
    },
    name,
    { polling: 50, timeout: 7000 }
  );
}

export async function runNativeMediaCase(page: Page, id: string): Promise<void> {
  if (!nativeMediaCases.some((entry) => entry.id === id))
    throw new Error(`Unknown native case ${id}`);
  await requireNativeCodec(page);
  if (id === 'NATIVE-001') {
    await mount(
      page,
      {
        speed: 40,
        video: { autoplay: true, muted: true, loop: true, pauseOnLeave: true, resetOnLeave: true },
      },
      { count: 3, contents: [videoMarkup('first'), 'Non-video slide', videoMarkup('last')] }
    );
    await waitForProgress(page, 'first');
    const pausedAt = await page.evaluate(() => {
      (window as unknown as AuditWindow).auditSlider.video!.pause(0);
      const video = document.querySelector<HTMLVideoElement>('[data-native-video="first"]')!;
      return { paused: video.paused, time: video.currentTime };
    });
    expect(pausedAt.paused, 'native-public-pause').toBe(true);
    await page.waitForTimeout(150);
    expect(
      await page
        .locator('[data-native-video="first"]')
        .evaluate((v: HTMLVideoElement) => v.currentTime),
      'native-paused-clock'
    ).toBeCloseTo(pausedAt.time, 2);
    await page.evaluate(() => (window as unknown as AuditWindow).auditSlider.video!.play(0));
    await waitForProgress(page, 'first');
    await page.evaluate(() => (window as unknown as AuditWindow).auditSlider.next());
    await settle(page);
    const left = await page
      .locator('[data-native-video="first"]')
      .evaluate((v: HTMLVideoElement) => ({ paused: v.paused, time: v.currentTime }));
    expect(left.paused, 'native-leave-pauses').toBe(true);
    expect(left.time, 'native-leave-resets').toBeLessThan(0.05);
    await page.evaluate(() => (window as unknown as AuditWindow).auditSlider.next());
    await settle(page);
    await waitForProgress(page, 'last');
    await page.evaluate(() => (window as unknown as AuditWindow).auditSlider.destroy());
    expect(
      await page
        .locator('video')
        .evaluateAll((videos) => videos.every((v) => (v as HTMLVideoElement).paused)),
      'native-destroy-pauses-all'
    ).toBe(true);
  } else if (id === 'NATIVE-002') {
    await mount(
      page,
      {
        speed: 40,
        loop: { withClones: true },
        video: { autoplay: true, muted: true, loop: true, pauseOnLeave: true },
      },
      { count: 3, contents: [videoMarkup('zero'), videoMarkup('one'), videoMarkup('two')] }
    );
    for (let step = 0; step < 4; step++) {
      if (step) {
        await page.evaluate(() => (window as unknown as AuditWindow).auditSlider.next());
        await settle(page);
      }
      await page.waitForFunction(
        () =>
          [...document.querySelectorAll<HTMLVideoElement>('#audit-slider video')].some(
            (video) => !video.paused && video.currentTime > 0.12
          ),
        undefined,
        { polling: 50, timeout: 7000 }
      );
      const state = await page.evaluate(() => {
        const slider = (window as unknown as AuditWindow).auditSlider;
        const viewport = slider.track.getBoundingClientRect();
        return {
          index: slider.realIndex,
          playing: [...slider.root.querySelectorAll<HTMLVideoElement>('video')]
            .filter((video) => !video.paused)
            .map((video) => {
              const slide = video.closest<HTMLElement>('.tvist-v1__slide')!;
              const bounds = slide.getBoundingClientRect();
              return {
                id: slide.dataset.caseId,
                visible:
                  bounds.right > viewport.left + 1 &&
                  bounds.left < viewport.right - 1 &&
                  bounds.bottom > viewport.top + 1 &&
                  bounds.top < viewport.bottom - 1,
              };
            }),
        };
      });
      expect(state.playing, 'native-clone-single-visible-player').toEqual([
        { id: `card-${state.index}`, visible: true },
      ]);
    }
  } else {
    let release!: () => void;
    const gate = new Promise<void>((done) => {
      release = done;
    });
    await page.route('**/fixture.webm?native-late*', async (route) => {
      await gate;
      await route.continue();
    });
    try {
      await mount(
        page,
        {
          speed: 40,
          video: {
            autoplay: true,
            muted: true,
            loop: true,
            pauseOnLeave: true,
            resetOnLeave: true,
          },
        },
        { count: 2, contents: [videoMarkup('late', '?native-late=1'), 'Non-video slide'] }
      );
      await page.evaluate(() => (window as unknown as AuditWindow).auditSlider.next());
      await settle(page);
      release();
      await page.waitForFunction(
        () =>
          document.querySelector<HTMLVideoElement>('[data-native-video="late"]')!.readyState >= 2,
        undefined,
        { polling: 50, timeout: 7000 }
      );
      await page.waitForTimeout(220);
      const late = await page
        .locator('[data-native-video="late"]')
        .evaluate((video: HTMLVideoElement) => ({ paused: video.paused, time: video.currentTime }));
      expect(late.paused, 'native-late-ready-stays-paused').toBe(true);
      expect(late.time, 'native-late-ready-stays-reset').toBeLessThan(0.05);
    } finally {
      release();
      await page.unrouteAll({ behavior: 'wait' });
    }
  }
}
